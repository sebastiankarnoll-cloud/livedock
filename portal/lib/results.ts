import type { ResultCode } from "../../engine/src/types.ts";

/** Names of the eight results, see docs/livedock-stand.md section 4. */
export const RESULT_LABELS: Record<ResultCode, string> = {
  gut_aufgestellt: "Gut aufgestellt",
  behebbar: "Behebbar",
  umbau_noetig: "Umbau nötig",
  akuter_fund: "Akuter Fund",
  stack_nicht_unterstuetzt: "Stack nicht unterstützt",
  nicht_pruefbar: "Nicht prüfbar",
  ausserhalb_angebot: "Außerhalb des Angebots",
  zielumgebung_passt_nicht: "Zielumgebung passt nicht",
};

export const RESULT_CODES = Object.keys(RESULT_LABELS) as ResultCode[];

export const isResultCode = (v: unknown): v is ResultCode => typeof v === "string" && (RESULT_CODES as string[]).includes(v);

export const resultLabel = (code: string | null | undefined) => (isResultCode(code) ? RESULT_LABELS[code] : "Noch kein Urteil");
