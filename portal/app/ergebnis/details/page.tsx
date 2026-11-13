import Link from "next/link";
import { Screen } from "../../parts.tsx";
import { resultGate } from "../gate.ts";
import { counts, listedFindings } from "../../../lib/ergebnis.ts";

export const dynamic = "force-dynamic";

const SEV = { hoch: "Hoch", mittel: "Mittel", niedrig: "Klein" } as const;

export default async function Details() {
  const { view } = await resultGate();
  const c = counts(view);
  const list = listedFindings(view);
  return (
    <Screen
      step={1}
      who="us"
      title={`Die ${c.hoch + c.mittel} wichtigsten Punkte im Überblick`}
      lead={`${c.hoch} wiegen schwer, ${c.mittel} mittel. Wie wir sie beheben, zeigen wir Dir im Paket mit Vorschau.`}
    >
      <ul className="finds">
        {list.map((f) => (
          <li key={f.id}>
            <span className={`sev ${f.severity}`}>{SEV[f.severity]}</span>
            <div>
              <b>{f.kategorie}</b>
              <div className="dim">{f.auswirkung}</div>
              <div className="dim small">Bereich: {f.bereich}</div>
            </div>
          </li>
        ))}
      </ul>
      {c.niedrig > 0 && <p className="dim">Dazu kommen {c.niedrig} kleinere {c.niedrig === 1 ? "Hinweis" : "Hinweise"}, die wir im Paket mit Dir durchgehen.</p>}
      <Link href="/ergebnis">Zurück zum Ergebnis</Link>
    </Screen>
  );
}
