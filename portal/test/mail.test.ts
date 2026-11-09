import { test, after } from "node:test";
import assert from "node:assert/strict";
import { SMTPServer } from "smtp-server";
import { smtpMailer, smtpConfigFromEnv, getMailer } from "../lib/mail.ts";

const got: { from: string; to: string[]; raw: string; user: string }[] = [];
const server = new SMTPServer({
  authOptional: false,
  allowInsecureAuth: true,
  disabledCommands: ["STARTTLS"],
  onAuth(auth, _s, cb) {
    if (auth.username === "info@livedock.de" && auth.password === "geheim") cb(null, { user: auth.username });
    else cb(new Error("bad login"));
  },
  onData(stream, session, cb) {
    let raw = "";
    stream.on("data", (d) => (raw += d));
    stream.on("end", () => {
      got.push({ from: session.envelope.mailFrom ? session.envelope.mailFrom.address : "", to: session.envelope.rcptTo.map((r) => r.address), raw, user: String((session.user as string) ?? "") });
      cb();
    });
  },
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.server.address() as { port: number }).port;
after(() => server.close());

test("SMTP-Versand: Absender, Empfänger, Betreff, Text", async () => {
  const m = smtpMailer({ host: "127.0.0.1", port, user: "info@livedock.de", pass: "geheim", from: "livedock. <info@livedock.de>", insecure: true });
  await m.send("kunde@firma.de", "Dein Anmelde-Link für livedock.", "Hallo\nhttp://x/anmelden/bestaetigen?t=abc");
  assert.equal(got.length, 1);
  assert.equal(got[0].from, "info@livedock.de");
  assert.deepEqual(got[0].to, ["kunde@firma.de"]);
  assert.match(got[0].raw, /Subject: =\?UTF-8\?Q\?Dein_Anmelde-Link/);
  assert.match(got[0].raw, /bestaetigen\?t=abc/);
});

test("falsches Passwort: Versand schlägt fehl, Passwort steht nicht in der Fehlermeldung", async () => {
  const m = smtpMailer({ host: "127.0.0.1", port, user: "info@livedock.de", pass: "falsch-123", from: "info@livedock.de", insecure: true });
  await assert.rejects(m.send("kunde@firma.de", "x", "y"), (e: Error) => !String(e.message).includes("falsch-123"));
});

test("ohne TLS wird nicht gesendet (Standard)", async () => {
  const m = smtpMailer({ host: "127.0.0.1", port, user: "info@livedock.de", pass: "geheim", from: "info@livedock.de" });
  const before = got.length;
  await assert.rejects(m.send("kunde@firma.de", "x", "y"));
  assert.equal(got.length, before);
});

test("Konfiguration: fehlende Werte werden benannt, unbekannter Mailer fällt nicht still zurück", () => {
  assert.throws(() => smtpConfigFromEnv({ SMTP_HOST: "h" }), /SMTP_USER missing/);
  const c = smtpConfigFromEnv({ SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "f" });
  assert.equal(c.port, 587);
  process.env.MAILER = "gibtsnicht";
  assert.throws(() => getMailer(null as never), /not implemented/);
  delete process.env.MAILER;
});
