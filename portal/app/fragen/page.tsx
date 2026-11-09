import { Screen } from "../parts.tsx";
import { guard } from "../weiter.ts";
import { submitAnswers } from "./actions.ts";

export const dynamic = "force-dynamic";

const AUDIENCE = ["Nur ich", "Mein Team", "Kunden oder externe Personen", "Weiß ich noch nicht"];
const TARGET = ["Bei Hetzner, in meinem eigenen Konto", "In einer Umgebung meiner Firma", "Weiß ich nicht"];

export default async function Fragen() {
  await guard("fragen");
  return (
    <Screen
      step={1}
      who="you"
      title="Vier kurze Fragen zu Deinem Tool."
      lead="Damit wir es richtig einordnen. Das dauert etwa eine Minute. Du kannst die Fragen auch überspringen."
      after="Der Check startet sofort. Du kannst den Tab schließen, das Ergebnis kommt per Mail."
    >
      <form action={submitAnswers} className="stack" style={{ gap: 22 }}>
        <div className="stack" style={{ gap: 8 }}>
          <label htmlFor="purpose">1. Wofür ist das Tool?</label>
          <input id="purpose" name="purpose" type="text" maxLength={300} placeholder="z. B. Teilnehmerverwaltung für Schulungen" />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <label htmlFor="audience">2. Wer nutzt es?</label>
          <select id="audience" name="audience" defaultValue={AUDIENCE[3]}>
            {AUDIENCE.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <label htmlFor="task">3. Was ist die wichtigste Aufgabe?</label>
          <input id="task" name="task" type="text" maxLength={300} placeholder="z. B. Anmeldungen sammeln und zusammenfassen" />
        </div>
        <fieldset className="stack" style={{ gap: 10, border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, paddingBottom: 8 }}>4. Wo soll das Tool laufen?</legend>
          {TARGET.map((t, i) => (
            <label key={t} className="choice">
              <input type="radio" name="target" value={t} defaultChecked={i === 0} />
              <span>{t}</span>
            </label>
          ))}
        </fieldset>
        <button className="btn" type="submit">
          Check starten
        </button>
        <button className="linkbtn" type="submit" name="skip" value="1" formNoValidate style={{ alignSelf: "center" }}>
          Fragen überspringen
        </button>
      </form>
    </Screen>
  );
}
