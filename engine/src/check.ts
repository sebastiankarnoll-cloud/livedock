import { detectStack } from "./stack.ts";
import type { AreaResult, CheckResult, ResultCode } from "./types.ts";

export const ENGINE_VERSION = "0.1.0";

const AREAS: Pick<AreaResult, "id" | "label">[] = [
  { id: "geheimnisse", label: "Geheimnisse" },
  { id: "zugang_rechte", label: "Zugang und Rechte" },
  { id: "daten_datenschutz", label: "Daten und Datenschutz" },
  { id: "ki_anbindung", label: "KI-Anbindung" },
  { id: "code_bausteine", label: "Code und Bausteine" },
];

export function runCheck(dir: string): CheckResult {
  const stack = detectStack(dir);

  let result: ResultCode | null = null;
  if (stack.status === "nicht_unterstuetzt") result = "stack_nicht_unterstuetzt";
  if (stack.status === "leer" || stack.status === "zu_gross") result = "nicht_pruefbar";

  // No scanner modules yet: every area stays "offen" (not checked).
  // Never report green for something that was not looked at.
  const areas: AreaResult[] = AREAS.map((a) => ({ ...a, ampel: "offen" as const }));

  return { engineVersion: ENGINE_VERSION, stack, result, areas };
}
