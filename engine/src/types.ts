// Result codes, see docs/livedock-stand.md section 4.
export type ResultCode =
  | "gut_aufgestellt" // 1
  | "behebbar" // 2
  | "umbau_noetig" // 3
  | "akuter_fund" // 4
  | "stack_nicht_unterstuetzt" // 5
  | "nicht_pruefbar" // 6
  | "ausserhalb_angebot" // 7
  | "zielumgebung_passt_nicht"; // 8

export type Ampel = "gruen" | "gelb" | "rot" | "offen";

export type AreaId =
  | "geheimnisse"
  | "zugang_rechte"
  | "daten_datenschutz"
  | "ki_anbindung"
  | "code_bausteine";

export interface AreaResult {
  id: AreaId;
  label: string;
  ampel: Ampel; // "offen" = not yet checked by any module
  note?: string;
}

export type StackStatus = "unterstuetzt" | "nicht_unterstuetzt" | "leer" | "zu_gross";

export interface StackInfo {
  status: StackStatus;
  /** e.g. "nextjs", "node", "python", "unbekannt" */
  kind: string;
  /** detected building blocks, names only (no paths, no code) */
  features: {
    supabase: boolean;
    ai: string[]; // e.g. ["openai", "mistral"]
    validation: boolean; // zod etc.
  };
  fileCount: number;
}

export interface CheckResult {
  engineVersion: string;
  stack: StackInfo;
  /** only set when the stack alone already decides (codes 5 and 6) */
  result: ResultCode | null;
  areas: AreaResult[];
}
