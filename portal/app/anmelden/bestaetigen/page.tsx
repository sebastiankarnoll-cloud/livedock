import { Screen } from "../../parts.tsx";
import { confirmLogin } from "../actions.ts";

export default async function Bestaetigen({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <Screen step={1} who="you" title="Jetzt anmelden." lead="Ein Klick, dann bist Du drin." after="Du verbindest Dein Projekt mit livedock.">
      <form action={confirmLogin} className="stack">
        <input type="hidden" name="t" value={t ?? ""} />
        <button className="btn" type="submit">
          Jetzt anmelden
        </button>
      </form>
    </Screen>
  );
}
