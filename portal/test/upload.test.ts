import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeZip } from "./zipmaker.ts";
import { pools, reset } from "./helpers.ts";
import { makePool, withUser } from "../lib/db.ts";
import { ensureCase } from "../lib/cases.ts";
import { saveProject, UploadError, projectDirIfPresent } from "../lib/upload.ts";
import { purgeExpired } from "../lib/purge.ts";

const { app, admin } = pools();
const worker = makePool("postgres://livedock_worker:worker@localhost:5432/livedock_test");
let root = "";
let a = "", b = "", caseA = "", caseB = "";
const mk = (z: Buffer) => Readable.from([z]);

before(async () => {
  await reset(admin);
  root = mkdtempSync(join(tmpdir(), "livedock-store-"));
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

const good = () => makeZip([
  { name: "proj/package.json", data: '{"name":"x"}' },
  { name: "proj/.env", data: "A=1" },
  { name: "proj/app/page.tsx", data: "export default 1" },
  { name: "proj/node_modules/lib/index.js", data: "x" },
  { name: "proj/.git/config", data: "x" },
]);

test("gültiges ZIP: entpackt, .env bleibt, node_modules und .git nicht, Zeile in der Datenbank", async () => {
  const r = await saveProject(app, { userId: a, caseId: caseA, filename: "proj.zip", body: mk(good()), root });
  assert.equal(r.files, 3);
  const dir = projectDirIfPresent(caseA, root)!;
  assert.ok(existsSync(join(dir, "proj/.env")));
  assert.ok(!existsSync(join(dir, "proj/node_modules")));
  assert.ok(!existsSync(join(dir, "proj/.git")));
  const row = await withUser(app, a, (c) => c.query("select file_count, original_name from projects"));
  assert.equal(row.rows[0].file_count, 3);
});

test("neuer Upload ersetzt den alten, es bleibt ein Projekt je Fall", async () => {
  await saveProject(app, { userId: a, caseId: caseA, filename: "neu.zip", body: mk(makeZip([{ name: "neu.txt", data: "n" }])), root });
  const dir = projectDirIfPresent(caseA, root)!;
  assert.deepEqual(readdirSync(dir), ["neu.txt"]);
  assert.equal((await withUser(app, a, (c) => c.query("select count(*)::int n from projects"))).rows[0].n, 1);
});

test("zip slip (../), absolute Pfade und Backslashes werden abgelehnt, nichts landet außerhalb", async () => {
  for (const name of ["../evil.txt", "a/../../evil.txt", "/etc/evil.txt", "..\\evil.txt", "C:/evil.txt"]) {
    await assert.rejects(
      saveProject(app, { userId: a, caseId: caseA, filename: "x.zip", body: mk(makeZip([{ name, data: "x" }])), root }),
      (e) => e instanceof UploadError && e.code === "unsafe",
      name,
    );
  }
  assert.ok(!existsSync(join(root, "evil.txt")) && !existsSync("/etc/evil.txt"));
  assert.ok(existsSync(join(projectDirIfPresent(caseA, root)!, "neu.txt")), "altes Projekt bleibt bei Fehler erhalten");
});

test("Symlinks werden abgelehnt", async () => {
  await assert.rejects(
    saveProject(app, { userId: a, caseId: caseA, filename: "x.zip", body: mk(makeZip([{ name: "link", data: "/etc/passwd", mode: 0o120777 }])), root }),
    (e) => e instanceof UploadError && e.code === "unsafe",
  );
});

test("Datei, die kein ZIP ist, wird abgelehnt", async () => {
  await assert.rejects(
    saveProject(app, { userId: a, caseId: caseA, filename: "x.zip", body: mk(Buffer.from("das ist kein zip, nur Text")), root }),
    (e) => e instanceof UploadError && e.code === "not_zip",
  );
});

test("zu großer Upload wird beim Empfang abgebrochen", async () => {
  await assert.rejects(
    saveProject(app, { userId: a, caseId: caseA, filename: "x.zip", body: mk(Buffer.alloc(2048, 1)), root, maxBytes: 1024 }),
    (e) => e instanceof UploadError && e.code === "too_large",
  );
  assert.ok(!existsSync(join(root, caseA, "upload.zip.part")), "Teildatei aufgeräumt");
});

test("ZIP-Bombe: kleine Datei, die riesig entpackt, wird gestoppt (echte Bytes zählen, nicht der Header)", async () => {
  const bomb = makeZip([{ name: "zeros.bin", data: Buffer.alloc(60 * 1024 * 1024), deflate: true }]);
  assert.ok(bomb.length < 1024 * 1024, "Archiv ist klein");
  await assert.rejects(
    saveProject(app, { userId: a, caseId: caseA, filename: "bomb.zip", body: mk(bomb), root }),
    (e) => e instanceof UploadError && e.code === "too_big_unpacked",
  );
  assert.ok(!existsSync(join(root, caseA, "code.new")));
});

test("leeres Projekt (nur node_modules) wird abgelehnt", async () => {
  await assert.rejects(
    saveProject(app, { userId: a, caseId: caseA, filename: "x.zip", body: mk(makeZip([{ name: "node_modules/x.js", data: "x" }])), root }),
    (e) => e instanceof UploadError && e.code === "empty",
  );
});

test("Kundentrennung: fremder Fall kann nicht beschrieben werden, jeder Fall hat einen eigenen Ordner", async () => {
  await assert.rejects(
    saveProject(app, { userId: b, caseId: caseA, filename: "x.zip", body: mk(good()), root }),
    (e) => e instanceof UploadError && e.code === "no_case",
  );
  await saveProject(app, { userId: b, caseId: caseB, filename: "b.zip", body: mk(good()), root });
  assert.notEqual(projectDirIfPresent(caseA, root), projectDirIfPresent(caseB, root));
  assert.equal((await withUser(app, a, (c) => c.query("select count(*)::int n from projects"))).rows[0].n, 1);
  assert.equal((await withUser(app, b, (c) => c.query("select count(*)::int n from projects"))).rows[0].n, 1);
});

test("Löschen nach 30 Tagen: Dateien und Zeile weg, Protokoll geschrieben, nur der abgelaufene Fall", async () => {
  await worker.query("update cases set delete_after = now() - interval '1 minute' where id = $1", [caseA]);
  assert.equal(await purgeExpired(worker, root), 1);
  assert.equal(projectDirIfPresent(caseA, root), null);
  assert.ok(!existsSync(join(root, caseA)));
  assert.ok(projectDirIfPresent(caseB, root), "anderer Fall bleibt unberührt");
  const log = await worker.query("select * from deletion_log");
  assert.equal(log.rowCount, 1);
  assert.equal(log.rows[0].case_id, caseA);
  assert.equal(log.rows[0].what, "code copy");
  assert.equal(await purgeExpired(worker, root), 0, "zweiter Lauf tut nichts");
  assert.equal((await worker.query("select count(*)::int n from deletion_log")).rows[0].n, 1);
});

test("Die App-Rolle kann das Protokoll nicht lesen oder ändern und keine fremden Fälle sehen", async () => {
  await assert.rejects(app.query("select * from deletion_log"));
  assert.equal((await app.query("select * from projects")).rowCount, 0);
});
