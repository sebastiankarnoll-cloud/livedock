import { detectStack } from "./stack.ts";
import { scanSecrets } from "./scanners/secrets.ts";
import { scanAccess } from "./scanners/access.ts";
import type { AreaResult, CheckResult, Finding, ResultCode } from "./types.ts";

export const ENGINE_VERSION = "0.3.0";

/** Findings below this confidence are dropped (hard rule 3). */
export const MIN_CONFIDENCE = 0.8;

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

  // Every area starts "offen" (not looked at). A module that has run sets
  // its area to gruen or rot. Never report green for something not checked.
  const areas: AreaResult[] = AREAS.map((a) => ({ ...a, ampel: "offen" as const }));
  const setAmpel = (id: AreaResult["id"], ampel: AreaResult["ampel"]) => {
    areas.find((a) => a.id === id)!.ampel = ampel;
  };

  let findings: Finding[] = [];
  if (stack.status === "unterstuetzt") {
    findings = scanSecrets(dir).filter((f) => f.konfidenz >= MIN_CONFIDENCE);
    setAmpel("geheimnisse", findings.some((f) => f.area === "geheimnisse") ? "rot" : "gruen");

    const access = scanAccess(dir, stack.features.supabase);
    const accessFindings = access.findings.filter((f) => f.konfidenz >= MIN_CONFIDENCE);
    findings = findings.concat(accessFindings);
    // Nothing to look at (no routes, no migrations) must not look green.
    if (access.examined) setAmpel("zugang_rechte", accessFindings.some((f) => f.severity === "hoch") ? "rot" : accessFindings.length ? "gelb" : "gruen");
  }

  return {
    engineVersion: ENGINE_VERSION,
    stack,
    result,
    acute: findings.some((f) => f.acute),
    areas,
    findings,
  };
}

/**
 * Customer view (hard rule 4): strips internal evidence (file, line, rule).
 * Sebastian's internal view keeps it.
 */
export function publicView(r: CheckResult): CheckResult {
  return { ...r, findings: r.findings.map(({ intern: _intern, ...rest }) => rest) };
}
