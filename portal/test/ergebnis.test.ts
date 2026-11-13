import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { pools, reset, STAFF_URL } from "./helpers.ts";
import { makePool, withUser } from "../lib/db.ts";
import { ensureCase } from "../lib/cases.ts";
import { devMailer } from "../lib/mail.ts";
import { acknowledgeAcute, acuteFindings, counts, headline, listedFindings, loadResult, type PublicResult } from "../lib/ergebnis.ts";
import { releaseResult } from "../lib/staff.ts";

const { app, admin } = pools();
const staff = makePool(STAFF_URL);

const f = (id: string, severity: "hoch" | "mittel" | "niedrig", acute = false) => ({
  id, area: "geheimnisse" as const, severity, kategorie: `Kat ${id}`, auswirkung: "Folge", bereich: "Code", konfidenz: 0.9, acute, hinweis: acute ? "sk-…5678" : undefined,
});
const view = (over: Partial<PublicResult> = {}): PublicResult => ({
  engineVersion: "t", stack: { status: "unterstuetzt", kind: "nextjs", features: { supabase: false, ai: [], validation: false }, fileCount: 3 },
  result: "behebbar", basis: "behebbar", positives: [], acute: false, areas: [], findings: [f("a", "hoch"), f("b", "mittel"), f("c", "niedrig")], ...over,
});

test("Überschrift und Satz je Ergebnis; Akut zeigt darunter die Basis", () => {
  assert.equal(headline(view()).title, "Dein Tool lässt sich sicher live bringen.");
  assert.match(headline(view()).lead, /3 Punkte/);
  assert.match(headline(view({ findings: [f("a", "hoch")] })).lead, /1 Punkt gefunden/);
  assert.equal(headline(view({ result: "gut_aufgestellt", findings: [] })).tone, "gut");
  assert.equal(headline(view({ result: "umbau_noetig" })).tone, "rot");
  assert.equal(headline(view({ result: "akuter_fund", basis: "umbau_noetig", acute: true })).code, "umbau_noetig");
  assert.equal(headline(view({ result: "akuter_fund", basis: null, acute: true })).code, "nicht_pruefbar");
  assert.equal(headline(view({ result: "stack_nicht_unterstuetzt" })).title, "Diesen Projekttyp prüfen wir noch nicht.");
  assert.equal(headline(view({ result: null })).code, "nicht_pruefbar");
  for (const r of ["ausserhalb_angebot", "zielumgebung_passt_nicht", "nicht_pruefbar"] as const) assert.equal(headline(view({ result: r })).tone, "neutral");
});

test("Zählung, Liste (schwer zuerst, kleine nur gezählt), akute Funde", () => {
  const v = view({ findings: [f("m", "mittel"), f("n", "niedrig"), f("h", "hoch"), f("k", "hoch", true)] });
  assert.deepEqual(counts(v), { hoch: 2, mittel: 1, niedrig: 1, total: 4 });
  assert.deepEqual(listedFindings(v).map((x) => x.id), ["h", "k", "m"]);
  assert.deepEqual(acuteFindings(v).map((x) => x.id), ["k"]);
});

let a = "", b = "", jobA = "";
before(async () => {
  await reset(admin);
  const ins = (e: string) => admin.query("insert into users(email, consent_at, consent_version) values ($1, now(), 'x') returning id", [e]).then((r) => r.rows[0].id as string);
  a = await ins("a@firma.de");
  b = await ins("b@firma.de");
  for (const [u, acute] of [[a, true], [b, true]] as const) {
    const c = await ensureCase(app, u);
    const j = await withUser(admin, u, (q) => q.query("insert into jobs(case_id, user_id, status, finished_at) values ($1,$2,'done',now()) returning id", [c.id, u]));
    const r = { ...view({ result: "akuter_fund", acute, findings: [f("k", "hoch", true)] }), reviewHint: false };
    await admin.query("insert into check_results_internal(job_id, case_id, user_id, engine_version, result_code, result_json) values ($1,$2,$3,'t','akuter_fund',$4)", [j.rows[0].id, c.id, u, JSON.stringify(r)]);
    if (u === a) jobA = j.rows[0].id;
    await releaseResult(staff, devMailer(admin), { jobId: j.rows[0].id, actor: "s@f.de", resultCode: "behebbar", baseUrl: "http://x" });
  }
});
after(async () => {
  await app.end();
  await admin.end();
  await staff.end();
});

test("Kunde lädt nur sein eigenes freigegebenes Ergebnis; Bestätigung gilt nur für ihn und nur einmal", async () => {
  const mine = await loadResult(app, a);
  assert.equal(mine?.view.result, "behebbar");
  assert.equal(mine?.acuteAckAt, null);
  assert.equal(await acknowledgeAcute(app, a), true);
  assert.equal(await acknowledgeAcute(app, a), false, "zweites Mal nichts");
  assert.ok((await loadResult(app, a))?.acuteAckAt);
  assert.equal((await loadResult(app, b))?.acuteAckAt, null, "fremdes Ergebnis bleibt unberührt");
});

test("Die App-Rolle darf am Ergebnis nur die Bestätigung ändern", async () => {
  await assert.rejects(withUser(app, a, (q) => q.query("update check_results_public set result_code = 'gut_aufgestellt'")), /permission denied/);
  await assert.rejects(withUser(app, a, (q) => q.query("update check_results_public set result_json = '{}'")), /permission denied/);
  await assert.rejects(withUser(app, a, (q) => q.query("delete from check_results_public")), /permission denied/);
  const other = await withUser(app, a, (q) => q.query("update check_results_public set acute_ack_at = null where user_id = $1", [b]));
  assert.equal(other.rowCount, 0, "fremde Zeile nicht änderbar");
  assert.ok(jobA);
});
