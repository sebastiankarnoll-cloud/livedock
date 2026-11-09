import { detectStack } from "./stack.ts";
import { scanSecrets } from "./scanners/secrets.ts";
import { scanAccess } from "./scanners/access.ts";
import { loadSources } from "./scanners/load.ts";
import { analyzeAiUsage } from "./scanners/aiusage.ts";
import { scanData } from "./scanners/data.ts";
import { scanAi } from "./scanners/ai.ts";
import { scanCode } from "./scanners/code.ts";
import type { AreaId, AreaResult, CheckResult, Finding, ResultCode } from "./types.ts";

export const ENGINE_VERSION = "0.4.0";

/** Findings below this confidence are dropped (hard rule 3). */
export const MIN_CONFIDENCE = 0.8;

/** From this many severe findings Sebastian is asked to look at a possible rebuild (result 3). */
export const REVIEW_HINT_HIGH_COUNT = 6;

const AREAS: Pick<AreaResult, "id" | "label">[] = [
  { id: "geheimnisse", label: "Geheimnisse" },
  { id: "zugang_rechte", label: "Zugang und Rechte" },
  { id: "daten_datenschutz", label: "Daten und Datenschutz" },
  { id: "ki_anbindung", label: "KI-Anbindung" },
  { id: "code_bausteine", label: "Code und Bausteine" },
];

/** Areas that must be fully looked at before the engine says "gut aufgestellt". Area 5 may be partial. */
const REQUIRED_FOR_GOOD: AreaId[] = ["geheimnisse", "zugang_rechte", "daten_datenschutz", "ki_anbindung"];

export const OSV_NOTE = "Bausteine mit bekannten Sicherheitslücken sind noch nicht geprüft.";

export function runCheck(dir: string): CheckResult {
  const stack = detectStack(dir);

  let result: ResultCode | null = null;
  if (stack.status === "nicht_unterstuetzt") result = "stack_nicht_unterstuetzt";
  if (stack.status === "leer" || stack.status === "zu_gross") result = "nicht_pruefbar";

  // Every area starts "offen" (not looked at). A module that has run sets its
  // area. Never report green for something not checked.
  const areas: AreaResult[] = AREAS.map((a) => ({ ...a, ampel: "offen" as const }));
  const setArea = (id: AreaId, ampel: AreaResult["ampel"], note?: string) => {
    const a = areas.find((x) => x.id === id)!;
    a.ampel = ampel;
    if (note) a.note = note;
  };
  const fromFindings = (list: Finding[]): AreaResult["ampel"] =>
    list.some((f) => f.severity === "hoch") ? "rot" : list.length ? "gelb" : "gruen";
  const keep = (list: Finding[]) => list.filter((f) => f.konfidenz >= MIN_CONFIDENCE);

  let findings: Finding[] = [];
  const positives: string[] = [];

  if (stack.status === "unterstuetzt") {
    // 1 Geheimnisse
    const secrets = keep(scanSecrets(dir));
    findings = findings.concat(secrets);
    setArea("geheimnisse", fromFindings(secrets));
    if (secrets.length === 0) positives.push("Keine Schlüssel oder Passwörter im Code gefunden");

    const { sources, sql: _sql } = loadSources(dir);

    // 2 Zugang und Rechte
    const access = scanAccess(dir, stack.features.supabase);
    const accessF = keep(access.findings);
    findings = findings.concat(accessF);
    if (access.examined) setArea("zugang_rechte", fromFindings(accessF));
    else setArea("zugang_rechte", "offen", "Keine Schnittstellen oder Datenbank-Migrationen gefunden, nichts zu prüfen.");
    if (access.stats.routes > 0 && access.stats.authed > 0 && !accessF.some((f) => f.intern?.regel === "route-without-auth"))
      positives.push("Anmeldung wird auf dem Server geprüft");
    if (access.stats.tables > 0 && access.stats.tablesWithoutRls === 0) positives.push("Zugriffsregeln in der Datenbank vorhanden");

    // 3 Daten und Datenschutz, 4 KI-Anbindung
    const usage = analyzeAiUsage(sources);
    const data = scanData(sources, usage.aiFiles, usage.aiRoutes);
    const dataF = keep(data.findings);
    findings = findings.concat(dataF);
    setArea("daten_datenschutz", data.examined ? fromFindings(dataF) : "offen");

    const ai = scanAi(sources, usage.aiFiles, usage.aiRoutes, data.personalToAi, stack.features.ai.length);
    const aiF = keep(ai.findings);
    findings = findings.concat(aiF);
    if (ai.status === "geprueft") setArea("ki_anbindung", fromFindings(aiF));
    else if (ai.status === "keine") setArea("ki_anbindung", "gruen", "Keine KI-Anbindung gefunden.");
    else setArea("ki_anbindung", "offen", "KI-Bibliothek vorhanden, aber kein erkennbarer Aufruf. Nicht geprüft.");
    if (stack.features.ai.length > 0 && stack.features.ai.every((p) => p === "mistral")) positives.push("KI-Dienst in der EU");
    if (ai.rateLimited) positives.push("Limit für KI-Aufrufe pro Nutzer vorhanden");

    // 5 Code und Bausteine: own rules only. Without the check for known
    // package vulnerabilities (osv-scanner) it never shows green.
    const code = scanCode(sources);
    const codeF = keep(code.findings);
    findings = findings.concat(codeF);
    if (code.examined) {
      const a = fromFindings(codeF);
      setArea("code_bausteine", a === "gruen" ? "teilweise" : a, OSV_NOTE);
    }
    if (stack.features.validation && !code.bodyUnvalidated) positives.push("Eingaben werden geprüft");
  }

  const acute = findings.some((f) => f.acute);

  // Overall result. Acute findings give 4, the basis underneath is 1 or 2.
  // The engine never decides "Umbau nötig" (3) on its own; it only hints.
  let basis: ResultCode | null = null;
  if (stack.status === "unterstuetzt") {
    if (findings.length > 0) basis = "behebbar";
    else if (REQUIRED_FOR_GOOD.every((id) => areas.find((a) => a.id === id)!.ampel === "gruen")) basis = "gut_aufgestellt";
  }
  const reviewHint = findings.filter((f) => f.severity === "hoch").length >= REVIEW_HINT_HIGH_COUNT;
  if (result === null) result = acute ? "akuter_fund" : basis;

  return { engineVersion: ENGINE_VERSION, stack, result, basis, reviewHint, positives, acute, areas, findings };
}

/**
 * Customer view (hard rule 4): strips internal evidence (file, line, rule).
 * Sebastian's internal view keeps it.
 */
export function publicView(r: CheckResult): CheckResult {
  return { ...r, findings: r.findings.map(({ intern: _intern, ...rest }) => rest) };
}
