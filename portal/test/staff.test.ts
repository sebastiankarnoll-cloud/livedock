import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { pools, reset, WORKER_URL, STAFF_URL } from "./helpers.ts";
import { makePool, withUser } from "../lib/db.ts";
import { ensureCase } from "../lib/cases.ts";
import { devMailer } from "../lib/mail.ts";
import { stageOf } from "../lib/flow.ts";
import { sendPendingAlerts } from "../lib/alerts.ts";
import { publicView } from "../../engine/src/check.ts";
import { customerView } from "../lib/publicview.ts";
import { alertAddress, getReview, holdResult, isStaff, listQueue, releaseResult, resendReleaseMail, sessionFresh } from "../lib/staff.ts";

const { app, admin } = pools();
const worker = makePool(WORKER_URL);
const staff = makePool(STAFF_URL);
const mailer = devMailer(admin);
const BASE = "http://portal.test";

let a = "", b = "";
const jobs: Record<string, string> = {};

const finding = (id: string, acute = false) => ({
  id, area: "geheimnisse", severity: "hoch", kategorie: "Schlüssel im Code", auswirkung: "x", bereich: "Code", konfidenz: 0.95, acute,
  hinweis: acute ? "sk-…ab12" : undefined, intern: { datei: "lib/secret-file.ts", zeile: 7, regel: "key-literal" },
});
const result = (acute: boolean) => ({
  engineVersion: "t", stack: { status: "unterstuetzt", kind: "nextjs", features: { supabase: false, ai: [], validation: false }, fileCount: 3 },
  result: acute ? "akuter_fund" : "behebbar", basis: "behebbar", reviewHint: true, positives: [], acute, areas: [], findings: [finding("f1", acute)],
});

async function makeJob(userId: string, acute: boolean): Promise<string> {
  const c = await ensureCase(app, userId);
  // The owner role is bound by row level security too, so write as the customer would own it.
  const j = await withUser(admin, userId, (q) => q.query("insert into jobs(case_id, user_id, status, finished_at) values ($1,$2,'done',now()) returning id", [c.id, userId]));
  const r = result(acute);
  await admin.query("insert into check_results_internal(job_id, case_id, user_id, engine_version, result_code, result_json) values ($1,$2,$3,'t',$4,$5)", [j.rows[0].id, c.id, userId, r.result, JSON.stringify(r)]);
  return j.rows[0].id;
}

before(async () => {
  await reset(admin);
  const ins = (e: string) => admin.query("insert into users(email, consent_at, consent_version) values ($1, now(), 'x') returning id", [e]).then((r) => r.rows[0].id as string);
  a = await ins("a@firma.de");
  b = await ins("b@firma.de");
  jobs.a = await makeJob(a, false);
  jobs.b = await makeJob(b, true);
});
after(async () => {
  await app.end();
  await admin.end();
  await worker.end();
  await staff.end();
});

test("Staff-Konten kommen aus der Server-Einstellung, Sitzungen sind kurz", () => {
  const env = { STAFF_EMAILS: " Sebastian@Firma.de , zweite@firma.de" };
  assert.ok(isStaff("sebastian@firma.de", env));
  assert.ok(!isStaff("kunde@firma.de", env));
  assert.ok(!isStaff("x@y.de", {}), "ohne Einstellung ist niemand Staff");
  assert.equal(alertAddress({ STAFF_EMAILS: "s@f.de" }), "s@f.de");
  assert.equal(alertAddress({ STAFF_EMAILS: "s@f.de", STAFF_ALERT_EMAIL: "handy@f.de" }), "handy@f.de");
  assert.throws(() => alertAddress({}));
  const now = Date.now();
  assert.ok(sessionFresh(new Date(now - 7 * 3600_000), now));
  assert.ok(!sessionFresh(new Date(now - 9 * 3600_000), now));
});

test("Vor der Freigabe sieht der Kunde nichts; die App-Rolle kommt an keine Ergebnisse", async () => {
  assert.equal((await stageOf(app, a)).stage, "wartet");
  await assert.rejects(app.query("select * from check_results_internal"), /permission denied/);
  const pub = await withUser(app, a, (c) => c.query("select * from check_results_public"));
  assert.equal(pub.rowCount, 0);
  await assert.rejects(app.query("insert into check_results_public(job_id, case_id, user_id, result_code, result_json, released_by) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'behebbar', '{}', 'x')"), /permission denied/);
  await assert.rejects(app.query("select * from review_log"), /permission denied/);
});

test("Warteschlange: akuter Fall zuerst, Belege nur in der Staff-Ansicht", async () => {
  const q = await listQueue(staff);
  assert.equal(q.waiting.length, 2);
  assert.equal(q.waiting[0].jobId, jobs.b);
  assert.ok(q.waiting[0].acute);
  const r = await getReview(staff, jobs.a);
  assert.equal(r?.email, "a@firma.de");
  assert.equal(r?.result?.findings[0].intern?.datei, "lib/secret-file.ts");
  assert.equal(await getReview(staff, "kein-uuid"), null);
});

test("Sofortmeldung: genau eine Mail mit Priorität, ohne Details; nur bei akutem Fund", async () => {
  const sent: { to: string; subject: string; body: string; high: boolean }[] = [];
  const spy = { async send(to: string, subject: string, body: string, o?: { priority?: "high" }) { sent.push({ to, subject, body, high: o?.priority === "high" }); } };
  assert.equal(await sendPendingAlerts(worker, spy, { to: "sebastian@f.de", baseUrl: BASE }), 1);
  assert.equal(await sendPendingAlerts(worker, spy, { to: "sebastian@f.de", baseUrl: BASE }), 0, "kein zweites Mal");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "sebastian@f.de");
  assert.ok(sent[0].high && sent[0].subject.startsWith("SOFORT"));
  assert.ok(sent[0].body.includes(`/steuerzentrale/${jobs.b}`));
  assert.ok(!/secret-file|sk-|Schlüssel im Code|b@firma/.test(sent[0].subject + sent[0].body), "keine Details in der Meldung");
  const log = await admin.query("select action, actor from review_log where job_id = $1", [jobs.b]);
  assert.deepEqual(log.rows, [{ action: "alerted", actor: "system" }]);
});

test("Fehlgeschlagene Sofortmeldung wird beim nächsten Durchlauf wiederholt", async () => {
  const c = await admin.query("select id from users where email = 'a@firma.de'");
  const u = c.rows[0].id as string;
  await withUser(admin, u, (q) => q.query("delete from jobs"));
  const id = await makeJob(u, true);
  const broken = { async send(): Promise<void> { throw new Error("smtp down"); } };
  assert.equal(await sendPendingAlerts(worker, broken, { to: "s@f.de", baseUrl: BASE }), 0);
  const row = await admin.query("select alerted_at from check_results_internal where job_id = $1", [id]);
  assert.equal(row.rows[0].alerted_at, null);
  assert.equal(await sendPendingAlerts(worker, mailer, { to: "s@f.de", baseUrl: BASE }), 1);
  jobs.a = id;
});

test("Freigabe: Kundensicht ohne Belege, Ergebnis wählbar, Protokoll, Mail nur mit Link", async () => {
  await admin.query("delete from outbox");
  const out = await releaseResult(staff, mailer, { jobId: jobs.b, actor: "staff@f.de", resultCode: "umbau_noetig", baseUrl: BASE });
  assert.equal(out, "released");
  // customer b sees the release; customer a does not
  assert.equal((await stageOf(app, b)).stage, "ergebnis");
  assert.equal((await stageOf(app, a)).stage, "wartet");
  const mine = await withUser(app, b, (c) => c.query("select result_code, result_json from check_results_public"));
  assert.equal(mine.rowCount, 1);
  assert.equal(mine.rows[0].result_code, "umbau_noetig");
  const view = mine.rows[0].result_json;
  assert.equal(view.result, "umbau_noetig");
  assert.ok(!JSON.stringify(view).includes("secret-file"), "keine Datei");
  assert.ok(!("reviewHint" in view), "kein interner Hinweis");
  assert.ok(view.findings.every((f: { intern?: unknown }) => f.intern === undefined));
  assert.equal((await withUser(app, a, (c) => c.query("select 1 from check_results_public"))).rowCount, 0, "fremde Freigabe unsichtbar");
  const mail = await admin.query("select to_email, subject, body from outbox");
  assert.equal(mail.rowCount, 1);
  assert.equal(mail.rows[0].to_email, "b@firma.de");
  assert.equal(mail.rows[0].subject, "Dein Ergebnis ist da");
  assert.ok(mail.rows[0].body.includes(`${BASE}/ergebnis`));
  assert.ok(!/Schlüssel|€|secret/.test(mail.rows[0].body), "weder Preis noch Funde");
  const log = (await admin.query("select action, actor, detail from review_log where job_id = $1 order by created_at", [jobs.b])).rows;
  assert.deepEqual(log.map((l) => l.action), ["alerted", "released", "mail_sent"]);
  assert.equal(log[1].actor, "staff@f.de");
  assert.equal(log[1].detail, "akuter_fund->umbau_noetig");
});

test("Zweite Freigabe tut nichts; unbekannte Eingaben werden abgelehnt", async () => {
  await admin.query("delete from outbox");
  assert.equal(await releaseResult(staff, mailer, { jobId: jobs.b, actor: "x@f.de", resultCode: "behebbar", baseUrl: BASE }), "already");
  assert.equal((await admin.query("select count(*)::int n from outbox")).rows[0].n, 0);
  assert.equal(await releaseResult(staff, mailer, { jobId: jobs.a, actor: "x@f.de", resultCode: "gratis", baseUrl: BASE }), "not_found");
  assert.equal(await releaseResult(staff, mailer, { jobId: "x'; drop table jobs;--", actor: "x@f.de", resultCode: "behebbar", baseUrl: BASE }), "not_found");
});

test("Zurückhalten gibt nichts frei; fehlgeschlagene Mail lässt sich erneut senden", async () => {
  assert.equal(await holdResult(staff, { jobId: jobs.a, actor: "s@f.de" }), true);
  assert.equal(await holdResult(staff, { jobId: jobs.a, actor: "s@f.de" }), false);
  assert.equal((await stageOf(app, a)).stage, "wartet");
  const broken = { async send(): Promise<void> { throw new Error("down"); } };
  assert.equal(await releaseResult(staff, broken, { jobId: jobs.a, actor: "s@f.de", resultCode: "behebbar", baseUrl: BASE }), "released");
  assert.equal((await stageOf(app, a)).stage, "ergebnis", "Freigabe steht trotz Mailfehler");
  assert.equal((await getReview(staff, jobs.a))?.release?.mailSentAt, null);
  await admin.query("delete from outbox");
  assert.equal(await resendReleaseMail(staff, mailer, { jobId: jobs.a, actor: "s@f.de", baseUrl: BASE }), true);
  assert.equal(await resendReleaseMail(staff, mailer, { jobId: jobs.a, actor: "s@f.de", baseUrl: BASE }), false);
  const actions = (await admin.query("select action from review_log where job_id = $1 order by created_at", [jobs.a])).rows.map((r) => r.action);
  assert.deepEqual(actions, ["alerted", "held", "released", "mail_failed", "mail_sent"]);
});

test("Kundensicht im Portal entfernt genau das, was die Engine entfernt (plus den Prüfhinweis)", () => {
  const r = result(true) as never;
  const { reviewHint: _h, ...engineView } = publicView(r);
  assert.deepEqual(customerView(r), engineView);
});
