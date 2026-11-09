import { Screen } from "../parts.tsx";

export default function Postfach() {
  return (
    <Screen step={1} who="you" title="Schau in Dein Postfach." lead="Wir haben Dir einen Link geschickt. Klicke darauf, dann bist Du angemeldet.">
      <div className="stack" style={{ gap: 6, fontSize: 14, color: "var(--soft)" }}>
        <div>Der Link gilt 15 Minuten. Nichts angekommen? Schau im Spam-Ordner nach.</div>
        <div>
          <a href="/anmelden">Andere Adresse eingeben oder Link erneut senden</a>
        </div>
      </div>
    </Screen>
  );
}
