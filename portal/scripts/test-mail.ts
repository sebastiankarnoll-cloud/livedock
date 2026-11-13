import { smtpConfigFromEnv, smtpMailer } from "../lib/mail.ts";

// Sends one test mail through the real SMTP account. Usage: node scripts/test-mail.ts you@example.com
// Needs SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM in the environment. Never prints the password.
const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-mail.ts <address>");
  process.exit(2);
}
try {
  await smtpMailer(smtpConfigFromEnv()).send(to, "Testmail von livedock.", "Wenn Du das liest, funktioniert der Versand.\n\nBitte prüfe: Liegt die Mail im Posteingang oder im Spam?");
  console.log("gesendet an", to);
} catch (e) {
  console.error("Senden fehlgeschlagen:", e instanceof Error ? e.message.replace(process.env.SMTP_PASS ?? "\0", "***") : "unbekannter Fehler");
  process.exit(1);
}
