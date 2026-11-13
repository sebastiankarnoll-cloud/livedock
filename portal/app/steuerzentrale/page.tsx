import { requireStaff } from "./guard.ts";
import Frame from "./frame.tsx";

export const dynamic = "force-dynamic";

const NOTES: Record<string, string> = {
  released: "Freigegeben. Die Mail an den Kunden ist unterwegs.",
  already: "Dieses Ergebnis war schon freigegeben.",
  not_found: "Dieser Fall wurde nicht gefunden.",
  held: "Zurückgehalten. Der Kunde sieht weiter nichts, melde Dich persönlich bei ihm.",
};

export default async function Steuerzentrale({ searchParams }: { searchParams: Promise<{ hinweis?: string }> }) {
  const { staff } = await requireStaff();
  const { hinweis } = await searchParams;
  return (
    <Frame staff={staff}>
      <div className="stack">
        <h1>Wähle einen Fall.</h1>
        <p className="lead">Der Kunde sieht nichts, bevor Du freigibst.</p>
      </div>
      {hinweis && NOTES[hinweis] && <div className="box">{NOTES[hinweis]}</div>}
    </Frame>
  );
}
