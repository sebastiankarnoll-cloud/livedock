import type { ReactNode } from "react";
import type pg from "pg";
import Link from "next/link";
import { listQueue, shortId, type QueueItem } from "../../lib/staff.ts";
import { resultLabel } from "../../lib/results.ts";

const sub = (i: QueueItem) => (i.released ? `${resultLabel(i.resultCode)} · freigegeben` : i.status === "failed" ? "Check fehlgeschlagen" : i.acute ? "Akut: bitte zuerst prüfen" : i.held ? `${resultLabel(i.resultCode)} · zurückgehalten` : resultLabel(i.resultCode));
const tone = (i: QueueItem) => (i.released ? "" : i.acute || i.status === "failed" ? "bad" : i.held ? "hold" : "");

/** Frame of the control center: header with counts, queue on the left, one case on the right. */
export default async function Frame(props: { staff: pg.Pool; active?: string; children: ReactNode }) {
  const q = await listQueue(props.staff);
  const urgent = q.waiting.filter((i) => i.acute).length;
  const Card = ({ i }: { i: QueueItem }) => (
    <Link href={`/steuerzentrale/${i.jobId}`} className={`sz-card ${tone(i)} ${props.active === i.jobId ? "on" : ""}`}>
      <b>Fall {shortId(i.caseId)}</b>
      <span>{sub(i)}</span>
    </Link>
  );
  return (
    <div>
      <div className="sz-head">
        <div className="sz-brand">
          <span className="logo">
            livedock<span>.</span>
          </span>
          <span className="step">Steuerzentrale</span>
        </div>
        <div className="sz-counts">
          <span className="badge you">{q.waiting.length} warten auf Dich</span>
          {urgent > 0 && <span className="badge urgent">{urgent} Sofortmeldung</span>}
        </div>
      </div>
      <div className="sz-body">
        <aside className="sz-side">
          <h2>Wartet auf Dich</h2>
          {q.waiting.length === 0 && <div className="note" style={{ textAlign: "left" }}>Nichts offen.</div>}
          {q.waiting.map((i) => (
            <Card key={i.jobId} i={i} />
          ))}
          {q.released.length > 0 && <h2 style={{ marginTop: 16 }}>Zuletzt freigegeben</h2>}
          {q.released.map((i) => (
            <Card key={i.jobId} i={i} />
          ))}
        </aside>
        <main className="sz-main">{props.children}</main>
      </div>
    </div>
  );
}
