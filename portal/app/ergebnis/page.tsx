import { Screen } from "../parts.tsx";
import { guard } from "../weiter.ts";
import { withUser, getPool } from "../../lib/db.ts";
import { resultLabel } from "../../lib/results.ts";
import { logout } from "../anmelden/actions.ts";

export const dynamic = "force-dynamic";

// Placeholder until step 2e: shows only what was released (customer view, no evidence).
export default async function Ergebnis() {
  const { user } = await guard("ergebnis");
  const row = await withUser(getPool(), user.id, async (q) => (await q.query("select result_code from check_results_public limit 1")).rows[0]);
  return (
    <Screen step={1} who="you" title={resultLabel(row?.result_code)} lead="Dein Ergebnis ist freigegeben. Die ausführliche Ergebnisseite folgt." after="Wir melden uns persönlich bei Dir.">
      <form action={logout}>
        <button className="linkbtn" type="submit">Abmelden ({user.email})</button>
      </form>
    </Screen>
  );
}
