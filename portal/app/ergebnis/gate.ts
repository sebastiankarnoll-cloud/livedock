import { redirect } from "next/navigation";
import { guard } from "../weiter.ts";
import { getPool } from "../../lib/db.ts";
import { loadResult } from "../../lib/ergebnis.ts";

/** Result pages: login, own stage, and an acute finding must be confirmed first. */
export async function resultGate(opts: { allowAcute?: boolean } = {}) {
  const g = await guard("ergebnis");
  const r = await loadResult(getPool(), g.user.id);
  if (!r) redirect("/wartet");
  if (r.view.acute && !r.acuteAckAt && !opts.allowAcute) redirect("/ergebnis/akut");
  return { ...g, ...r };
}
