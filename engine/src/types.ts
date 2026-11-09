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

export type Severity = "hoch" | "mittel" | "niedrig";

/**
 * A finding as the customer may see it (hard rule 4): category, impact,
 * rough area. No file, no line, no code, no fix. The only exception is a
 * real key, which is named with a masked hint (hard rule 2).
 */
export interface Finding {
  id: string;
  area: AreaId;
  severity: Severity;
  kategorie: string;
  auswirkung: string;
  /** rough area, e.g. "Code", "Konfiguration" */
  bereich: string;
  /** 0..1; findings below the threshold are dropped before output */
  konfidenz: number;
  /** real key or open database: banner above everything */
  acute: boolean;
  /** masked hint such as "sk-…5678"; never the secret itself */
  hinweis?: string;
  /** internal evidence for Sebastian only; stripped from customer output */
  intern?: { datei: string; zeile: number; regel: string };
}

export interface CheckResult {
  engineVersion: string;
  stack: StackInfo;
  /** only set when the stack alone already decides (codes 5 and 6) */
  result: ResultCode | null;
  /** true if at least one finding is acute (result 4 banner) */
  acute: boolean;
  areas: AreaResult[];
  findings: Finding[];
}
