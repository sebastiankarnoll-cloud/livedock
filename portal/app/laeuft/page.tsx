import { Screen } from "../parts.tsx";
import { guard } from "../weiter.ts";
import { STEP_LABELS } from "../../lib/flow.ts";
import Progress from "./Progress.tsx";

export const dynamic = "force-dynamic";

export default async function Laeuft() {
  await guard("laeuft");
  return (
    <Screen step={1} who="us" title="Wir prüfen Dein Projekt." lead="Das dauert ein paar Minuten. Du musst nichts tun." after="Danach schauen wir noch einmal persönlich drüber. Das Ergebnis kommt per Mail.">
      <Progress labels={Object.entries(STEP_LABELS)} />
      <p className="note" style={{ textAlign: "left" }}>
        Hier siehst Du nur den Fortschritt, noch kein Ergebnis. Du kannst diesen Tab schließen.
      </p>
    </Screen>
  );
}
