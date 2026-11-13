import Link from "next/link";
import { Screen } from "../parts.tsx";
import { resultGate } from "./gate.ts";
import { AMPEL_LABEL, counts, headline } from "../../lib/ergebnis.ts";
import { logout } from "../anmelden/actions.ts";

export const dynamic = "force-dynamic";

export default async function Ergebnis() {
  const { user, view, deleteAfter } = await resultGate();
  const h = headline(view);
  const c = counts(view);
  const date = deleteAfter.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });
  const checked = view.stack.status === "unterstuetzt";
  return (
    <Screen step={1} who="you" title={h.title} lead={h.lead} after="Wir melden uns bei Dir, sobald Du Fragen hast oder loslegen willst. Antworte dafür einfach auf die Mail mit dem Link.">
      <div>
        <span className={`chip ${h.tone}`}>Ergebnis: {h.chip}</span>
      </div>

      {checked && c.total > 0 && (
        <div className="box">
          <b>{c.total} {c.total === 1 ? "Fund" : "Funde"}</b>
          <div className="dim">{c.hoch} schwer · {c.mittel} mittel · {c.niedrig} klein</div>
          <p style={{ marginTop: 10 }}>
            <Link href="/ergebnis/details">Die Punkte ansehen</Link>
          </p>
        </div>
      )}

      {checked && (
        <section className="stack" aria-labelledby="bereiche">
          <h2 id="bereiche" className="h2">Prüfbereiche</h2>
          <ul className="areas">
            {view.areas.map((a) => (
              <li key={a.id}>
                <span className={`dot ${a.ampel}`} aria-hidden="true" />
                <div>
                  <b>{a.label}</b>
                  <span className="dim"> · {AMPEL_LABEL[a.ampel] ?? a.ampel}</span>
                  {a.note && <div className="dim small">{a.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.positives.length > 0 && (
        <section className="stack" aria-labelledby="gut">
          <h2 id="gut" className="h2">Das ist gut</h2>
          <ul className="areas">
            {view.positives.map((p) => (
              <li key={p}>
                <span className="dot gruen" aria-hidden="true" />
                <div>{p}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="box">Dein Check ist kostenlos. Weitere Checks für dieses Projekt sind Teil des Pakets.</div>

      <div className="signed">
        <span className="avatar" aria-hidden="true">SK</span>
        <span>Geprüft und freigegeben von Sebastian Karnoll. Deine Code-Kopie wird am {date} automatisch gelöscht.</span>
      </div>

      <form action={logout}>
        <button className="linkbtn" type="submit">Abmelden ({user.email})</button>
      </form>
    </Screen>
  );
}
