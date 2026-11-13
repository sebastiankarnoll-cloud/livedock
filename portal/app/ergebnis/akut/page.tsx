import { redirect } from "next/navigation";
import { guard } from "../../weiter.ts";
import { getPool } from "../../../lib/db.ts";
import { acuteFindings, loadResult } from "../../../lib/ergebnis.ts";
import { confirmRenewed } from "../actions.ts";

export const dynamic = "force-dynamic";

export default async function Akut({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { user } = await guard("ergebnis");
  const r = await loadResult(getPool(), user.id);
  if (!r || !r.view.acute || r.acuteAckAt) redirect("/ergebnis");
  const { fehler } = await searchParams;
  const list = acuteFindings(r.view);
  return (
    <main className="col">
      <div className="row">
        <div className="logo">livedock<span>.</span></div>
        <div className="step">Schritt 1 von 5 · Prüfen</div>
      </div>
      <div className="alert" role="alert">
        <div className="row" style={{ justifyContent: "flex-start", gap: 12 }}>
          <span className="chip rot">AKUT</span>
          <span className="badge you">Du bist dran</span>
        </div>
        <h1>Bitte erneuere jetzt diese Zugänge.</h1>
        <p className="lead">In Deinem Projekt liegen echte Zugangsdaten offen. Wer den Code sieht, kann sie benutzen. Das hat Vorrang vor allem anderen.</p>
        <ul className="finds">
          {list.map((f) => (
            <li key={f.id}>
              <div>
                <b>{f.kategorie}</b>
                <div className="dim small">Bereich: {f.bereich}</div>
              </div>
              {f.hinweis && <code className="mask">{f.hinweis}</code>}
            </li>
          ))}
        </ul>
      </div>
      <ol className="steps">
        <li><span className="num">1</span><div><b>Erneuere alle Zugänge beim jeweiligen Anbieter</b><div className="dim">Die alten Zugänge gelten ab dann nicht mehr.</div></div></li>
        <li><span className="num">2</span><div><b>Bestätige hier, dass Du es erledigt hast</b><div className="dim">Danach siehst Du Dein Ergebnis.</div></div></li>
      </ol>
      <form action={confirmRenewed} className="stack">
        {fehler && <div className="err" role="alert">Bitte bestätige zuerst, dass Du die Zugänge erneuert hast.</div>}
        <label className="check" htmlFor="done">
          <input id="done" name="done" type="checkbox" />
          <span>Ich habe alle Zugänge erneuert.</span>
        </label>
        <button className="btn" type="submit">Erledigt, weiter zum Ergebnis</button>
      </form>
      <div className="after">
        <b>Was danach passiert</b>
        <span>Du siehst Dein Ergebnis mit allen weiteren Punkten. Beim Go-Live-Paket prüfen wir noch einmal nach, dass keine offenen Zugänge mehr im Projekt liegen. Schlüssel zeigen wir nie vollständig.</span>
      </div>
    </main>
  );
}
