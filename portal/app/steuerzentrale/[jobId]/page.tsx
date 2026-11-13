import { notFound } from "next/navigation";
import { requireStaff } from "../guard.ts";
import Frame from "../frame.tsx";
import { getReview, shortId } from "../../../lib/staff.ts";
import { RESULT_CODES, resultLabel } from "../../../lib/results.ts";
import { hold, release, resendMail } from "../actions.ts";

export const dynamic = "force-dynamic";

const SEV: Record<string, string> = { hoch: "Hoch", mittel: "Mittel", niedrig: "Niedrig" };
const fmt = (d: Date) => new Date(d).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
const NOTES: Record<string, string> = { mail: "Mail erneut gesendet.", nomail: "Es gab nichts zu senden." };

export default async function Fall({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ hinweis?: string }> }) {
  const { staff } = await requireStaff();
  const { jobId } = await params;
  const { hinweis } = await searchParams;
  const r = await getReview(staff, jobId);
  if (!r) notFound();
  const res = r.result;
  const high = res?.findings.filter((f) => f.severity === "hoch").length ?? 0;
  return (
    <Frame staff={staff} active={r.item.jobId}>
      <div className="stack">
        <div>
          {r.item.released ? (
            <span className="badge us">Freigegeben</span>
          ) : r.item.acute ? (
            <span className="badge urgent">Akuter Fund</span>
          ) : (
            <span className="badge you">Du bist dran</span>
          )}
        </div>
        <div className="step">
          Fall {shortId(r.item.caseId)} · {r.email}
        </div>
        <h1>{r.item.released ? "Ergebnis ist freigegeben" : "Ergebnis prüfen und freigeben"}</h1>
        <p className="lead">Der Kunde sieht nichts, bevor Du freigibst. Die Mail an ihn enthält nur einen Link, weder Preis noch Funde.</p>
      </div>

      {hinweis && NOTES[hinweis] && <div className="box">{NOTES[hinweis]}</div>}

      {!res ? (
        <div className="err">Der automatische Check hat nicht geklappt. Es gibt kein Ergebnis zum Freigeben. Melde Dich persönlich beim Kunden.</div>
      ) : (
        <>
          <div className="sz-table">
            <div><span>Vorschlag der Engine</span><b>{resultLabel(res.result)}</b></div>
            <div><span>Darunter (ohne Akut-Banner)</span><b>{resultLabel(res.basis)}</b></div>
            <div><span>Funde (sicher)</span><b>{res.findings.length}, davon {high} hoch</b></div>
            <div><span>Hinweis „Umbau prüfen“</span><b>{res.reviewHint ? "ja" : "nein"}</b></div>
            <div><span>Stack</span><b>{res.stack.kind} · {res.stack.fileCount} Dateien</b></div>
            <div><span>Engine</span><b>{r.engineVersion}</b></div>
            <div><span>Code-Kopie wird gelöscht</span><b>{fmt(r.deleteAfter)}</b></div>
          </div>

          {r.release ? (
            <div className="stack">
              <div className="box">
                Freigegeben am {fmt(r.release.at)} von {r.release.by}. Ergebnis für den Kunden: <b>{resultLabel(r.release.finalCode)}</b>.{" "}
                {r.release.mailSentAt ? `Mail gesendet am ${fmt(r.release.mailSentAt)}.` : "Die Mail ist noch nicht raus."}{" "}
                {r.item.acute && (r.release.acuteAckAt ? `Kunde hat die Erneuerung der Zugänge am ${fmt(r.release.acuteAckAt)} bestätigt.` : "Kunde hat die Erneuerung der Zugänge noch nicht bestätigt.")}
              </div>
              {!r.release.mailSentAt && (
                <form action={resendMail}>
                  <input type="hidden" name="jobId" value={r.item.jobId} />
                  <button className="btn" type="submit">Mail erneut senden</button>
                </form>
              )}
            </div>
          ) : (
            <form action={release} className="stack">
              <input type="hidden" name="jobId" value={r.item.jobId} />
              <label htmlFor="result">Ergebnis für den Kunden</label>
              <select id="result" name="result" defaultValue={res.result ?? "nicht_pruefbar"}>
                {RESULT_CODES.map((c) => (
                  <option key={c} value={c}>{resultLabel(c)}{c === res.result ? " (Vorschlag der Engine)" : ""}</option>
                ))}
              </select>
              <button className="btn" type="submit">Freigeben und an Kunden senden</button>
            </form>
          )}
          {!r.release && !r.item.held && (
            <form action={hold} style={{ textAlign: "center" }}>
              <input type="hidden" name="jobId" value={r.item.jobId} />
              <button className="linkbtn" type="submit">Zurückhalten, persönlich melden</button>
            </form>
          )}
          {r.item.held && <div className="box">Zurückgehalten. Du kannst trotzdem noch freigeben.</div>}

          <details className="sz-details">
            <summary>Funde mit Beleg ansehen ({res.findings.length}), nur für Dich</summary>
            <div>
              {res.findings.map((f) => (
                <div key={f.id} className="sz-find">
                  <div><span className={f.severity === "hoch" ? "sev-hoch" : "sev-mittel"}>{SEV[f.severity]}</span> · {f.kategorie}{f.hinweis ? ` · ${f.hinweis}` : ""}</div>
                  <div className="sz-ev">{f.intern ? `${f.intern.datei}${f.intern.zeile ? `:${f.intern.zeile}` : ""} · ` : ""}Konfidenz {f.konfidenz.toFixed(2).replace(".", ",")}</div>
                </div>
              ))}
              {res.findings.length === 0 && <div className="sz-ev">Keine Funde.</div>}
            </div>
          </details>

          {r.answers && (
            <details className="sz-details">
              <summary>Antworten des Kunden</summary>
              <div className="sz-ev" style={{ marginTop: 12 }}>
                {r.answers.skipped ? "Übersprungen." : `Zweck: ${r.answers.purpose || "–"} · Nutzer: ${r.answers.audience || "–"} · Aufgabe: ${r.answers.task || "–"} · Zielumgebung: ${r.answers.target || "–"}`}
              </div>
            </details>
          )}
        </>
      )}

      {r.log.length > 0 && (
        <div className="after">
          <b>Protokoll</b>
          {r.log.map((l, i) => (
            <span key={i}>{fmt(l.at)} · {l.action} · {l.actor}{l.detail ? ` · ${l.detail}` : ""}</span>
          ))}
        </div>
      )}
    </Frame>
  );
}
