import { resolve } from "node:path";
import { runCheck } from "./check.ts";
import type { CheckResult } from "./types.ts";

const USAGE = "usage: livedock check <path> [--json]";

const RESULT_TEXT: Record<string, string> = {
  stack_nicht_unterstuetzt: "Stack nicht unterstützt",
  nicht_pruefbar: "Nicht prüfbar",
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
  lines.push("● prüfbereiche");
  for (const a of r.areas) lines.push(`  ⎿ ${a.label}: ${a.ampel === "offen" ? "noch nicht geprüft" : a.ampel}`);
  return lines.join("\n");
}

function main(argv: string[]): number {
  const [cmd, target, ...flags] = argv;
  if (cmd !== "check" || !target) {
    console.error(USAGE);
    return 2;
  }
  const result = runCheck(resolve(target));
  console.log(flags.includes("--json") ? JSON.stringify(result, null, 2) : render(result));
  return 0;
}

process.exit(main(process.argv.slice(2)));
