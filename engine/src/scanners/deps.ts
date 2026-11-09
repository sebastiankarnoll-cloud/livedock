import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Finding } from "../types.ts";

// Area 5, dependency part: known security holes in used packages.
//
// Uses `npm audit` (GitHub Advisory data via the npm registry). Hard rule 1:
// customer code is never executed. Only the data files package.json and
// package-lock.json are copied into an empty temp directory; npm runs there
// with --ignore-scripts and --package-lock-only, so no install script and no
// customer file is ever run. Only package names and versions leave the
// machine (to registry.npmjs.org), never source code.
//
// Production server needs outbound access to registry.npmjs.org.

export type AuditStatus =
  | "geprueft" //       exact versions from the lockfile were checked
  | "geschaetzt" //     no lockfile: versions resolved from the ranges, may differ from the customer's
  | "nicht_moeglich" // npm or registry unreachable, unreadable package.json
  | "uebersprungen"; // switched off (LIVEDOCK_AUDIT=off)

export interface DepsScan {
  status: AuditStatus;
  findings: Finding[];
  note?: string;
}

export interface RunResult {
  stdout: string;
  status: number | null;
}
export type Runner = (cwd: string, args: string[]) => RunResult;

const TIMEOUT_MS = 90_000;

const realRunner: Runner = (cwd, args) => {
  const r = spawnSync("npm", args, {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    maxBuffer: 20_000_000,
    // Never inherit project settings; scripts stay off even if npm is configured otherwise.
    env: { ...process.env, npm_config_ignore_scripts: "true", npm_config_update_notifier: "false" },
  });
  return { stdout: r.stdout ?? "", status: r.status };
};

interface AuditJson {
  error?: unknown;
  vulnerabilities?: Record<string, { severity?: string; isDirect?: boolean }>;
}

/** Turns `npm audit --json` output into findings (exported for tests). */
export function parseAudit(json: AuditJson, konfidenz: number): Finding[] {
  const hoch: string[] = [];
  const mittel: string[] = [];
  const niedrig: string[] = [];
  for (const [name, v] of Object.entries(json.vulnerabilities ?? {})) {
    const label = `${name} (${v.severity}${v.isDirect ? ", direkt" : ""})`;
    if (v.severity === "critical" || v.severity === "high") hoch.push(label);
    else if (v.severity === "moderate") mittel.push(label);
    else if (v.severity === "low") niedrig.push(label);
  }
  const out: Finding[] = [];
  const add = (severity: Finding["severity"], names: string[], word: string) => {
    if (!names.length) return;
    out.push({
      id: `code-vuln-${severity}`,
      area: "code_bausteine",
      severity,
      kategorie: `${names.length} ${names.length === 1 ? "Baustein" : "Bausteine"} mit bekannter Sicherheitslücke (${word})`,
      auswirkung: "Für diese Bausteine sind Angriffe öffentlich bekannt. Je nach Nutzung im Projekt können Angreifer sie ausnutzen.",
      bereich: "Bausteine",
      konfidenz,
      acute: false,
      intern: { datei: "package.json", zeile: 1, regel: `vuln-${severity}`, detail: names.sort().slice(0, 15).join(", ") },
    });
  };
  add("hoch", hoch, "kritisch oder hoch");
  add("mittel", mittel, "mittel");
  add("niedrig", niedrig, "niedrig");
  return out;
}

export function auditDependencies(dir: string, run: Runner = realRunner): DepsScan {
  if (process.env.LIVEDOCK_AUDIT === "off") return { status: "uebersprungen", findings: [] };

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    return { status: "nicht_moeglich", findings: [], note: "package.json nicht lesbar." };
  }
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const optional = (pkg.optionalDependencies ?? {}) as Record<string, string>;
  if (Object.keys(deps).length + Object.keys(optional).length === 0) return { status: "geprueft", findings: [] };

  const tmp = mkdtempSync(join(tmpdir(), "livedock-audit-"));
  try {
    // Data only: no scripts, no dev dependencies, nothing else from the project.
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ name: "livedock-audit", version: "0.0.0", private: true, dependencies: deps, optionalDependencies: optional }),
    );
    const lock = join(dir, "package-lock.json");
    const hasLock = existsSync(lock);
    if (hasLock) copyFileSync(lock, join(tmp, "package-lock.json"));

    const flags = ["--ignore-scripts", "--no-fund", "--omit=dev"];
    if (!hasLock) {
      const inst = run(tmp, ["install", "--package-lock-only", "--no-audit", ...flags]);
      if (inst.status !== 0) return { status: "nicht_moeglich", findings: [], note: "Bausteine konnten nicht aufgelöst werden." };
    }
    const res = run(tmp, ["audit", "--json", "--omit=dev"]);
    let json: AuditJson;
    try {
      json = JSON.parse(res.stdout);
    } catch {
      return { status: "nicht_moeglich", findings: [], note: "Lücken-Datenbank nicht erreichbar." };
    }
    if (json.error) return { status: "nicht_moeglich", findings: [], note: "Lücken-Datenbank nicht erreichbar." };

    const status: AuditStatus = hasLock ? "geprueft" : "geschaetzt";
    return {
      status,
      // Estimated versions may differ from the customer's: confidence stays below MIN_CONFIDENCE,
      // so such findings are dropped (hard rule 3) and the area stays "teilweise".
      findings: parseAudit(json, hasLock ? 0.95 : 0.6),
      note: hasLock ? undefined : "Keine Lockfile im Projekt: Versionen geschätzt.",
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
