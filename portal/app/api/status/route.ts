import { getPool, withUser } from "../../../lib/db.ts";
import { currentUser } from "../../../lib/session.ts";

export const dynamic = "force-dynamic";

// Progress only: which steps are done and whether the check has finished. Never the result (hard rule 5).
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ fehler: "Bitte melde Dich an." }, { status: 401 });
  const r = await withUser(getPool(), user.id, (q) => q.query("select status, steps_done from jobs limit 1"));
  const j = r.rows[0];
  return Response.json({ status: j?.status ?? "none", steps: j?.steps_done ?? [] });
}
