import type pg from "pg";
import type { CheckResult, Finding, ResultCode } from "../../engine/src/types.ts";
import { withUser } from "./db.ts";

/** The released result as the customer gets it: no evidence, no review hint (see lib/publicview.ts). */
export type PublicResult = Omit<CheckResult, "reviewHint">;

export type Tone = "gut" | "gelb" | "rot" | "neutral";

export interface Headline {
  code: ResultCode;
  chip: string;
  title: string;
  lead: string;
  tone: Tone;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function counts(v: PublicResult) {
  const n = (s: Finding["severity"]) => v.findings.filter((f) => f.severity === s).length;
  return { hoch: n("hoch"), mittel: n("mittel"), niedrig: n("niedrig"), total: v.findings.length };
}

/** Findings that are listed one by one (high and medium). Small ones are only counted. */
export const listedFindings = (v: PublicResult) => v.findings.filter((f) => f.severity !== "niedrig").sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "hoch" ? -1 : 1));
export const acuteFindings = (v: PublicResult) => v.findings.filter((f) => f.acute);

/**
 * Headline and one calm sentence per result (docs/livedock-stand.md, section 4).
 * "Akuter Fund" is shown as its own page first; underneath, the result is the engine's basis.
 */
export function headline(v: PublicResult): Headline {
  const code: ResultCode = v.result === "akuter_fund" ? (v.basis ?? "nicht_pruefbar") : (v.result ?? "nicht_pruefbar");
  const n = counts(v).total;
  switch (code) {
    case "gut_aufgestellt":
      return { code, chip: "Gut aufgestellt", tone: "gut", title: "Dein Tool ist gut aufgestellt.", lead: "Wir haben keine sicheren Funde im Code. Für den Live-Gang fehlen noch Server, Backups und Unterlagen." };
    case "behebbar":
      return { code, chip: "Behebbar", tone: "gelb", title: "Dein Tool lässt sich sicher live bringen.", lead: `Wir haben ${n} ${plural(n, "Punkt", "Punkte")} gefunden, die vor dem Live-Gang behoben werden müssen. Das ist normal und gut machbar. Ein Umbau ist nicht erkennbar.` };
    case "umbau_noetig":
      return { code, chip: "Umbau nötig", tone: "rot", title: "Bei Deinem Tool lohnt sich ein genauer Blick.", lead: "Wir haben Punkte gefunden, die sich nicht mit kleinen Korrekturen lösen lassen. Das besprechen wir am besten persönlich. Ein Festpreis ist hier nicht sinnvoll." };
    case "stack_nicht_unterstuetzt":
      return { code, chip: "Noch nicht unterstützt", tone: "neutral", title: "Diesen Projekttyp prüfen wir noch nicht.", lead: "Wir starten mit Next.js- und Node-Projekten. Wir haben Dein Projekt gelesen, aber nicht geprüft." };
    case "ausserhalb_angebot":
      return { code, chip: "Außerhalb des Angebots", tone: "neutral", title: "Dein Projekt liegt außerhalb unseres Angebots.", lead: "Wir helfen bei Tools, die Firmen und Gründer sicher live bringen wollen. Danke für Dein Vertrauen." };
    case "zielumgebung_passt_nicht":
      return { code, chip: "Sonderfall", tone: "neutral", title: "Deine Zielumgebung ist ein Sonderfall.", lead: "Das besprechen wir am besten persönlich." };
    default:
      return { code, chip: "Nicht prüfbar", tone: "neutral", title: "Wir konnten Dein Projekt nicht prüfen.", lead: "Wir melden uns persönlich bei Dir." };
  }
}

export const AMPEL_LABEL: Record<string, string> = {
  gruen: "In Ordnung",
  gelb: "Mittel",
  rot: "Hoch",
  teilweise: "Teilweise geprüft",
  offen: "Nicht geprüft",
};

/** The released result of the logged-in customer, or null. Runs bound to the user (row level security). */
export async function loadResult(pool: pg.Pool, userId: string): Promise<{ view: PublicResult; acuteAckAt: Date | null } | null> {
  const r = await withUser(pool, userId, (q) => q.query("select result_json, acute_ack_at from check_results_public limit 1"));
  return r.rowCount ? { view: r.rows[0].result_json as PublicResult, acuteAckAt: r.rows[0].acute_ack_at } : null;
}

/** Confirms that the acute access data was renewed. Only possible for an acute result; does nothing a second time. */
export async function acknowledgeAcute(pool: pg.Pool, userId: string): Promise<boolean> {
  const r = await withUser(pool, userId, (q) =>
    q.query("update check_results_public set acute_ack_at = now() where acute_ack_at is null and coalesce((result_json->>'acute')::boolean, false)"),
  );
  return r.rowCount === 1;
}
