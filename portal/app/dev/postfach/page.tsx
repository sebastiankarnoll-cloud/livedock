import { notFound } from "next/navigation";
import { getPool } from "../../../lib/db.ts";

export const dynamic = "force-dynamic";

// Development only: shows the stored mails so the login can be clicked through without a mail service.
export default async function DevPostfach() {
  // Must be switched on explicitly: this page shows login links of everybody, so it must never exist in production.
  if (process.env.DEV_OUTBOX !== "1" || process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_OUTBOX_IN_PROD_BUILD !== "1") notFound();
  const r = await getPool().query("select to_email, subject, body, created_at from outbox order by created_at desc limit 10");
  return (
    <main className="col">
      <h1>Entwicklung: Mail-Ausgang</h1>
      {r.rows.map((m, i) => (
        <div className="box" key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          <b>An:</b> {m.to_email}
          {"\n"}
          <b>Betreff:</b> {m.subject}
          {"\n\n"}
          {String(m.body).split(/(https?:\/\/\S+)/).map((p: string, j: number) => (/^https?:/.test(p) ? <a key={j} href={p}>{p}</a> : p))}
        </div>
      ))}
    </main>
  );
}
