import { Screen } from "../parts.tsx";
import { guard } from "../weiter.ts";
import { logout } from "../anmelden/actions.ts";

export const dynamic = "force-dynamic";

export default async function Wartet() {
  const { failed, user } = await guard("wartet");
  return (
    <Screen
      step={1}
      who="us"
      title={failed ? "Wir melden uns persönlich bei Dir." : "Wir schauen noch einmal persönlich drüber."}
      lead={failed ? "Bei Deinem Projekt hat der automatische Check nicht geklappt. Das liegt nicht an Dir." : "Bei den ersten Checks prüft Sebastian jedes Ergebnis selbst, bevor Du es bekommst. So liest Du nichts Falsches."}
      after="Du bekommst eine Mail mit dem Link zu Deinem Ergebnis."
    >
      <div className="box">
        <b>{failed ? "Wir melden uns bei Dir." : "Dein Ergebnis kommt in etwa 1 Stunde per Mail."}</b>
        <div style={{ color: "var(--dim)", marginTop: 4 }}>Du musst nichts tun und kannst diesen Tab schließen.</div>
      </div>
      <form action={logout}>
        <button className="linkbtn" type="submit">
          Abmelden ({user.email})
        </button>
      </form>
    </Screen>
  );
}
