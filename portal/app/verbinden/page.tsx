import { Screen } from "../parts.tsx";
import { logout } from "../anmelden/actions.ts";
import { guard } from "../weiter.ts";
import Uploader from "./Uploader.tsx";

export const dynamic = "force-dynamic";

const PROMISES = [
  "Wir lesen den Code nur, wir führen ihn nie aus",
  "Keine Nutzerdaten, nur Code",
  "KI-Analyse nur in der EU, ohne Training mit Deinem Code",
  "Kopie nach 30 Tagen automatisch gelöscht",
];

export default async function Verbinden() {
  const { user } = await guard("verbinden");
  return (
    <Screen
      step={1}
      who="you"
      title="Lade Dein Projekt als ZIP-Datei hoch."
      lead="Damit wir es prüfen können. Wir lesen den Code nur, wir führen ihn nie aus."
      after="Du beantwortest vier kurze Fragen, dann startet der Check."
    >
      <div className="box stack" style={{ gap: 8 }}>
        {PROMISES.map((p) => (
          <div key={p}>
            <span style={{ color: "var(--accent)" }}>✓</span> {p}
          </div>
        ))}
      </div>
      <Uploader />
      <form action={logout}>
        <button className="linkbtn" type="submit">
          Abmelden ({user.email})
        </button>
      </form>
    </Screen>
  );
}
