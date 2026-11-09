import { redirect } from "next/navigation";
import { Screen } from "../parts.tsx";
import { currentUser } from "../../lib/session.ts";
import { getPool } from "../../lib/db.ts";
import { ensureCase } from "../../lib/cases.ts";
import { logout } from "../anmelden/actions.ts";

export const dynamic = "force-dynamic";

export default async function Verbinden() {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  const c = await ensureCase(getPool(), user.id);
  return (
    <Screen step={1} who="you" title="Verbinde Dein Projekt mit livedock." lead="Damit wir es prüfen können. Wir lesen den Code nur, wir führen ihn nie aus.">
      <div className="box">
        Angemeldet als {user.email}. Deine Code-Kopie würde am {new Date(c.delete_after).toLocaleDateString("de-DE")} automatisch gelöscht. Das Verbinden kommt im nächsten Schritt.
      </div>
      <form action={logout}>
        <button className="linkbtn" type="submit">
          Abmelden
        </button>
      </form>
    </Screen>
  );
}
