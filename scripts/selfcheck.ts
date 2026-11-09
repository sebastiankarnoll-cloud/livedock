// livedock checks itself with its own engine. Only files tracked in git are checked
// (staged or committed, not local .env files). Fails if the engine reports any finding.
// Usage: node scripts/selfcheck.ts [portal|engine ...]
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck } from "../engine/src/check.ts";

const root = resolve(import.meta.dirname, "..");
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ["portal", "engine"];
let failed = false;

for (const t of targets) {
  const tmp = mkdtempSync(join(tmpdir(), "livedock-self-"));
  try {
    execFileSync("bash", ["-c", `cd "${root}" && git ls-files -z -- "${t}" | tar --null -T - -cf - | tar -x -C "${tmp}"`]);
    const r = runCheck(join(tmp, t));
    const areas = r.areas.map((a) => `${a.label}: ${a.ampel}`).join(", ");
    console.log(`${t}: result=${r.result ?? "none"}, findings=${r.findings.length} (${areas})`);
    for (const f of r.findings) console.log(`  ${f.severity}: ${f.kategorie} [${f.intern?.datei}:${f.intern?.zeile}]${f.intern?.detail ? " " + f.intern.detail : ""}`);
    if (r.findings.length > 0) failed = true;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
process.exit(failed ? 1 : 0);
