// Needs network (registry.npmjs.org). Run with: npm run test:live
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck, publicView } from "../../src/check.ts";

const root = resolve(import.meta.dirname, "../../..");
let fx: string;
before(() => {
  fx = mkdtempSync(join(tmpdir(), "livedock-live-"));
  execFileSync("bash", [join(root, "testprojekte/materialize.sh"), fx], { stdio: "pipe" });
});
after(() => rmSync(fx, { recursive: true, force: true }));

test("08: Lockfile, zwei bekannte Lücken, Bereich 5 rot, Gesamt Behebbar", () => {
  const r = runCheck(join(fx, "08-alte-bausteine"));
  const a5 = r.areas.find((a) => a.id === "code_bausteine")!;
  assert.equal(a5.ampel, "rot");
  const f = r.findings.filter((x) => x.area === "code_bausteine");
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, "hoch");
  assert.match(f[0].intern!.detail!, /lodash/);
  assert.match(f[0].intern!.detail!, /minimist/);
  assert.equal(r.result, "behebbar");
  assert.doesNotMatch(JSON.stringify(publicView(r)), /lodash|minimist|detail/);
});

test("01 bis 03: kein Fund aus dem Baustein-Abgleich (Versionen geschätzt, daher höchstens teilweise)", () => {
  for (const p of ["01-sauber", "02-schluessel-offen", "03-zugriff-fehlt"]) {
    const r = runCheck(join(fx, p));
    assert.deepEqual(r.findings.filter((x) => x.id.startsWith("code-vuln")), [], p);
    assert.notEqual(r.areas.find((a) => a.id === "code_bausteine")!.ampel, "gruen", p);
  }
});

test("Ohne Netz bleibt Bereich 5 ehrlich: nie grün", () => {
  const prev = process.env.npm_config_registry;
  process.env.npm_config_registry = "http://127.0.0.1:9";
  try {
    const r = runCheck(join(fx, "01-sauber"));
    assert.equal(r.areas.find((a) => a.id === "code_bausteine")!.ampel, "teilweise");
  } finally {
    if (prev === undefined) delete process.env.npm_config_registry;
    else process.env.npm_config_registry = prev;
  }
});
