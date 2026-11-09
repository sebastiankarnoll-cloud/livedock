import { Screen } from "../parts.tsx";
import { requestLink } from "./actions.ts";

const ERRORS: Record<string, string> = {
  email: "Bitte gib eine gültige E-Mail-Adresse ein.",
  consent: "Bitte bestätige den Datenschutzhinweis.",
  link: "Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen an.",
};

export default async function Anmelden({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  return (
    <Screen
      step={1}
      who="you"
      title="Wie lautet Deine E-Mail-Adresse?"
      lead="Wir schicken Dir einen Link zum Anmelden. Ein Passwort brauchst Du nicht."
      after="Du bekommst eine Mail mit einem Anmelde-Link. Danach verbindest Du Dein Projekt."
    >
      <form action={requestLink} className="stack" style={{ gap: 24 }}>
        {fehler && ERRORS[fehler] && (
          <div className="err" role="alert">
            {ERRORS[fehler]}
          </div>
        )}
        <div className="stack" style={{ gap: 8 }}>
          <label htmlFor="email">E-Mail-Adresse</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="name@firma.de" required />
        </div>
        <label className="check">
          <input type="checkbox" name="consent" required />
          <span>
            Ich habe die <a href="/datenschutz">Datenschutzerklärung</a> gelesen. Ich bin einverstanden, dass livedock meinen Code liest (nur lesen, nie ausführen), ausschließlich in der EU verarbeitet und nach 30 Tagen löscht.
          </span>
        </label>
        <button className="btn" type="submit">
          Link per Mail senden
        </button>
        <p className="note">Schon registriert? Gib einfach dieselbe Adresse ein.</p>
      </form>
    </Screen>
  );
}
