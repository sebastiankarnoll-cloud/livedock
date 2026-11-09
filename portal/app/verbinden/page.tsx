import { redirect } from "next/navigation";
import { Screen } from "../parts.tsx";
import { currentUser } from "../../lib/session.ts";
import { getPool, withUser } from "../../lib/db.ts";
import { ensureCase } from "../../lib/cases.ts";
import { logout } from "../anmelden/actions.ts";
import Uploader from "./Uploader.tsx";

export const dynamic = "force-dynamic";

const PROMISES = [
  "Wir lesen den Code nur, wir führen ihn nie aus",
  "Keine Nutzerdaten, nur Code",
  "KI-Analyse nur in der EU, ohne Training mit Deinem Code",
  "Kopie nach 30 Tagen automatisch gelöscht",
];

export default async function Verbinden() {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  const pool = getPool();
  const c = await ensureCase(pool, user.id);
  const project = await withUser(pool, user.id, async (q) => (await q.query("select original_name, file_count from projects limit 1")).rows[0]);
  const until = new Date(c.delete_after).toLocaleDateString("de-DE");

  return (
    <Screen
      step={1}
      who="you"
      title={project ? "Dein Projekt ist angekommen." : "Lade Dein Projekt als ZIP-Datei hoch."}
      lead={project ? "Wir haben es gespeichert. Als Nächstes stellen wir Dir vier kurze Fragen." : "Damit wir es prüfen können. Wir lesen den Code nur, wir führen ihn nie aus."}
      after={project ? "Die vier Fragen und der Start des Checks kommen im nächsten Schritt." : "Du beantwortest vier kurze Fragen, dann startet der Check."}
    >
      {project ? (
        <div className="box">
          {project.original_name}: {project.file_count} Dateien. Die Kopie wird am {until} automatisch gelöscht.
        </div>
      ) : (
        <>
          <div className="box stack" style={{ gap: 8 }}>
            {PROMISES.map((p) => (
              <div key={p}>
                <span style={{ color: "var(--accent)" }}>✓</span> {p}
              </div>
            ))}
          </div>
          <Uploader />
        </>
      )}
      <form action={logout}>
        <button className="linkbtn" type="submit">
          Abmelden ({user.email})
        </button>
      </form>
    </Screen>
  );
}
