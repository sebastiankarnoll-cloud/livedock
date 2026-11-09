import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeZip } from "./zipmaker.ts";
import { pools, reset, WORKER_URL } from "./helpers.ts";
import { makePool, withUser } from "../lib/db.ts";
import { ensureCase } from "../lib/cases.ts";
import { saveProject } from "../lib/upload.ts";
import { startCheck, stageOf } from "../lib/flow.ts";
import { claimNext, drainQueue, runJob, projectRoot } from "../lib/worker.ts";

process.env.LIVEDOCK_AUDIT = "off"; // no network in tests

const { app, admin } = pools();
const worker = makePool(WORKER_URL);
let root = "";
let a = "", b = "", caseA = "", caseB = "";

const project = (prefix = "") =>
  makeZip([
    { name: `${prefix}package.json`, data: '{"name":"p","dependencies":{"next":"15.5.0","@supabase/supabase-js":"2.50.0"}}' },
    { name: `${prefix}app/api/items/route.ts`, data: 'import { db } from "@/lib/db";\nexport async function GET() {\n  const { data } = await db.from("items").select("*");\n  return Response.json(data);\n}\n' },
    { name: `${prefix}lib/db.ts`, data: 'import { createClient } from "@supabase/supabase-js";\nexport const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);\n' },
  ]);

before(async () => {
  await reset(admin);
  root = mkdtempSync(join(tmpdir(), "livedock-chk-"));
  process.env.STORAGE_DIR = root;
  const ins = (e: string) => admin.query("insert into users(email, consent_at, consent_version) values ($1, now(), 'x') returning id", [e]).then((r) => r.rows[0].id as string);
  a = await ins("a@firma.de");
  b = await ins("b@firma.de");
  caseA = (await ensureCase(app, a)).id;
  caseB = (await ensureCase(app, b)).id;
});
after(async () => {
  rmSync(root, { recursive: true, force: true });
  await app.end();
  await admin.end();
  await worker.end();
});

test("Stufen: verbinden, fragen, läuft, wartet", async () => {
  assert.equal((await stageOf(app, a)).stage, "verbinden");
  assert.equal(await startCheck(app, a, "skip"), false, "ohne Projekt startet nichts");
  await saveProject(app, { userId: a, caseId: caseA, filename: "p.zip", body: Readable.from([project("proj/")]), root });
  assert.equal((await stageOf(app, a)).stage, "fragen");
  assert.equal(await startCheck(app, a, { purpose: "Test", audience: "Mein Team", task: "x", target: "Bei Hetzner" }), true);
  assert.equal((await stageOf(app, a)).stage, "laeuft");
  assert.equal(await startCheck(app, a, "skip"), false, "ein kostenloser Check je Fall");
  const ans = await withUser(app, a, (c) => c.query("select skipped, purpose from case_answers"));
  assert.deepEqual(ans.rows, [{ skipped: false, purpose: "Test" }]);
});

test("Der Worker prüft das Projekt, meldet Schritte der Reihe nach und legt das Ergebnis intern ab", async () => {
  assert.equal(await drainQueue(worker, root), 1);
  const j = await worker.query("select status, steps_done from jobs where case_id = $1", [caseA]);
  assert.equal(j.rows[0].status, "done");
  assert.deepEqual(j.rows[0].steps_done, ["stack", "geheimnisse", "zugang_rechte", "daten_datenschutz", "ki_anbindung", "code_bausteine"]);
  const r = await worker.query("select result_code, result_json from check_results_internal where case_id = $1", [caseA]);
  assert.equal(r.rows[0].result_code, "behebbar");
  assert.ok(r.rows[0].result_json.findings.length > 0);
  assert.equal((await stageOf(app, a)).stage, "wartet");
  assert.equal(await drainQueue(worker, root), 0, "nichts mehr in der Warteschlange");
});

test("Der Kunde sieht das Ergebnis nicht (harte Regel 5): kein Zugriff auf die interne Tabelle", async () => {
  await assert.rejects(app.query("select * from check_results_internal"), /permission denied/);
  await assert.rejects(withUser(app, a, (c) => c.query("select * from check_results_internal")), /permission denied/);
  // the customer can see the job (status only), nothing about findings
  const j = await withUser(app, a, (c) => c.query("select * from jobs"));
  assert.deepEqual(Object.keys(j.rows[0]).sort(), ["case_id", "created_at", "error", "finished_at", "id", "started_at", "status", "steps_done", "user_id"]);
});

test("Aufträge sind je Fall getrennt: Kunde B sieht den Auftrag von A nicht", async () => {
  assert.equal((await withUser(app, b, (c) => c.query("select * from jobs"))).rowCount, 0);
  assert.equal((await withUser(app, b, (c) => c.query("select * from case_answers"))).rowCount, 0);
});

test("Zwei Worker holen nie denselben Auftrag", async () => {
  await saveProject(app, { userId: b, caseId: caseB, filename: "p.zip", body: Readable.from([project()]), root });
  await startCheck(app, b, "skip");
  const [x, y] = await Promise.all([claimNext(worker), claimNext(worker)]);
  assert.ok((x === null) !== (y === null), "genau einer bekommt den Auftrag");
  await runJob(worker, (x ?? y)!, root);
});

test("Fehlgeschlagener Check: Status failed, keine Details, Stufe wartet mit Fehlerhinweis", async () => {
  const c = await admin.query("insert into users(email, consent_at, consent_version) values ('c@firma.de', now(), 'x') returning id");
  const cu = c.rows[0].id as string;
  const cc = (await ensureCase(app, cu)).id;
  await saveProject(app, { userId: cu, caseId: cc, filename: "p.zip", body: Readable.from([project()]), root });
  await startCheck(app, cu, "skip");
  rmSync(join(root, cc, "code"), { recursive: true, force: true });
  await drainQueue(worker, root);
  const j = await worker.query("select status, error from jobs where case_id = $1", [cc]);
  assert.deepEqual(j.rows[0], { status: "failed", error: "check failed" });
  const s = await stageOf(app, cu);
  assert.equal(s.stage, "wartet");
  assert.equal(s.failed, true);
});

test("projectRoot geht in einen einzelnen Oberordner hinein", async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const d = mkdtempSync(join(tmpdir(), "livedock-pr-"));
  mkdirSync(join(d, "proj"));
  writeFileSync(join(d, "proj", "package.json"), "{}");
  assert.equal(projectRoot(d), join(d, "proj"));
  writeFileSync(join(d, "extra.txt"), "x");
  assert.equal(projectRoot(d), d);
  rmSync(d, { recursive: true, force: true });
});
