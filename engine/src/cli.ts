import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { runCheck, publicView } from "./check.ts";
import type { CheckResult } from "./types.ts";

const USAGE = "usage: livedock check <path> [--json] [--intern]";

const RESULT_TEXT: Record<string, string> = {
  gut_aufgestellt: "1 Gut aufgestellt",
  behebbar: "2 Behebbar",
  umbau_noetig: "3 Umbau nötig",
  akuter_fund: "4 Akuter Fund",
  stack_nicht_unterstuetzt: "5 Stack nicht unterstützt",
  nicht_pruefbar: "6 Nicht prüfbar",
  ausserhalb_angebot: "7 Außerhalb des Angebots",
  zielumgebung_passt_nicht: "8 Zielumgebung passt nicht",
};

const AMPEL_TEXT: Record<string, string> = {
  gruen: "grün",
  gelb: "gelb",
  rot: "rot",
  teilweise: "teilweise geprüft",
  offen: "noch nicht geprüft",
};

const STATUS_TEXT: Record<string, string> = {
  unterstuetzt: "unterstützt",
  nicht_unterstuetzt: "nicht unterstützt",
  leer: "leer",
  zu_gross: "zu groß",
};

function render(r: CheckResult): string {
  const f = r.stack.features;
  const lines = [
    `livedock check (engine ${r.engineVersion})`,
    `● stack: ${r.stack.kind} (${STATUS_TEXT[r.stack.status]}), ${r.stack.fileCount} dateien`,
  ];
  if (r.stack.status === "unterstuetzt") {
    lines.push(`  ⎿ supabase: ${f.supabase ? "ja" : "nein"}`);
    lines.push(`  ⎿ ki-dienste: ${f.ai.length ? f.ai.join(", ") : "keine erkannt"}`);
    lines.push(`  ⎿ eingabeprüfung-bibliothek: ${f.validation ? "ja" : "nein"}`);
  }
  if (r.result) lines.push(`● ergebnis: ${RESULT_TEXT[r.result]}`);
  if (r.acute) {
    lines.push("● akuter fund: echter zugang im code gefunden, sofort erneuern");
    if (r.basis) lines.push(`  ⎿ darunter: ${RESULT_TEXT[r.basis]}`);
  }
  lines.push("● prüfbereiche");
  for (const a of r.areas) lines.push(`  ⎿ ${a.label}: ${AMPEL_TEXT[a.ampel]}${a.note ? ` (${a.note})` : ""}`);
  if (r.positives.length) {
    lines.push("● positives");
    for (const p of r.positives) lines.push(`  ⎿ ${p}`);
  }
  if (r.findings.length) {
    lines.push(`● funde (${r.findings.length})`);
    for (const x of r.findings) {
      const hint = x.hinweis ? ` [${x.hinweis}]` : "";
      lines.push(`  ⎿ ${x.severity}: ${x.kategorie}, bereich ${x.bereich}${hint}`);
      if (x.intern) lines.push(`      intern: ${x.intern.datei}:${x.intern.zeile} (${x.intern.regel})`);
    }
  }
  if (r.reviewHint) lines.push("● hinweis: viele schwere funde, bitte auf möglichen umbau prüfen");
  return lines.join("\n");
}

function main(argv: string[]): number {
  const [cmd, target, ...flags] = argv;
  if (cmd !== "check" || !target) {
    console.error(USAGE);
    return 2;
  }
  const dir = resolve(target);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`error: path not found or not a directory: ${target}`);
    return 2;
  }
  const full = runCheck(dir);
  // Default output is the customer view. Evidence only with --intern.
  const out = flags.includes("--intern") ? full : publicView(full);
  console.log(flags.includes("--json") ? JSON.stringify(out, null, 2) : render(out));
  return 0;
}

process.exit(main(process.argv.slice(2)));
