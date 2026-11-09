import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { requestLoginLink, consumeLoginToken, getSessionUser, endSession, InputError, hashToken } from "../lib/auth.ts";
import { devMailer } from "../lib/mail.ts";
import { pools, reset, lastToken } from "./helpers.ts";

const { app, admin } = pools();
const mailer = devMailer(app);
const base = "http://localhost:3000";
after(async () => {
  await app.end();
  await admin.end();
});
beforeEach(() => reset(admin));
before(() => reset(admin));

test("ungültige E-Mail und fehlende Einwilligung werden abgelehnt", async () => {
  await assert.rejects(requestLoginLink(app, mailer, { email: "kaputt", consent: true, baseUrl: base }), (e) => e instanceof InputError && e.code === "email");
  await assert.rejects(requestLoginLink(app, mailer, { email: "a@b.de", consent: false, baseUrl: base }), (e) => e instanceof InputError && e.code === "consent");
  assert.equal((await admin.query("select count(*)::int n from users")).rows[0].n, 0);
});

test("Link kommt per Mail, gilt einmal, danach Sitzung", async () => {
  await requestLoginLink(app, mailer, { email: "Anna@Firma.de", consent: true, baseUrl: base });
  const mail = (await admin.query("select * from outbox")).rows[0];
  assert.equal(mail.to_email, "anna@firma.de");
  assert.match(mail.body, /localhost:3000\/anmelden\/bestaetigen\?t=/);
  const token = await lastToken(admin, "anna@firma.de");

  const s = await consumeLoginToken(app, token);
  assert.ok(s);
  const user = await getSessionUser(app, s.sessionToken);
  assert.equal(user?.email, "anna@firma.de");
  assert.equal(await consumeLoginToken(app, token), null, "zweite Benutzung muss scheitern");
  assert.notEqual((await admin.query("select verified_at from users")).rows[0].verified_at, null);
});

test("Token liegen nur als Hash in der Datenbank", async () => {
  await requestLoginLink(app, mailer, { email: "b@firma.de", consent: true, baseUrl: base });
  const token = await lastToken(admin, "b@firma.de");
  const s = (await consumeLoginToken(app, token))!;
  const rows = JSON.stringify((await admin.query("select * from login_tokens")).rows) + JSON.stringify((await admin.query("select * from sessions")).rows);
  assert.ok(!rows.includes(token));
  assert.ok(!rows.includes(s.sessionToken));
  assert.ok(rows.includes(hashToken(token)));
});

test("abgelaufener Link und falscher Link funktionieren nicht", async () => {
  await requestLoginLink(app, mailer, { email: "c@firma.de", consent: true, baseUrl: base });
  const token = await lastToken(admin, "c@firma.de");
  await admin.query("update login_tokens set expires_at = now() - interval '1 minute'");
  assert.equal(await consumeLoginToken(app, token), null);
  assert.equal(await consumeLoginToken(app, "falsch"), null);
});

test("Sitzung endet bei Abmeldung und bei Ablauf", async () => {
  await requestLoginLink(app, mailer, { email: "d@firma.de", consent: true, baseUrl: base });
  const s = (await consumeLoginToken(app, await lastToken(admin, "d@firma.de")))!;
  assert.ok(await getSessionUser(app, s.sessionToken));
  await admin.query("update sessions set expires_at = now() - interval '1 second'");
  assert.equal(await getSessionUser(app, s.sessionToken), null);
  await admin.query("update sessions set expires_at = now() + interval '1 day'");
  await endSession(app, s.sessionToken);
  assert.equal(await getSessionUser(app, s.sessionToken), null);
  assert.equal(await getSessionUser(app, undefined), null);
});

test("Antwort verrät nicht, ob es das Konto gibt; mehr als 5 Links in 15 Minuten werden still verworfen", async () => {
  for (let i = 0; i < 8; i++) await requestLoginLink(app, mailer, { email: "e@firma.de", consent: true, baseUrl: base });
  assert.equal((await admin.query("select count(*)::int n from outbox")).rows[0].n, 5);
  assert.equal((await admin.query("select count(*)::int n from users")).rows[0].n, 1);
});
