import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck } from "../src/check.ts";

const root = resolve(import.meta.dirname, "../..");
let fx: string;

before(() => {
  fx = mkdtempSync(join(tmpdir(), "livedock-fx-"));
  execFileSync("bash", [join(root, "testprojekte/materialize.sh"), fx], { stdio: "pipe" });
});
after(() => rmSync(fx, { recursive: true, force: true }));

test("04-umbau-noetig: Behebbar mit Hinweis, Engine setzt Umbau nie selbst", () => {
  const r = runCheck(join(fx, "04-umbau-noetig"));
  assert.equal(r.result, "behebbar");
  assert.notEqual(r.result, "umbau_noetig");
  assert.equal(r.acute, false);
  assert.equal(r.reviewHint, true);
  const hoch = r.findings.filter((f) => f.severity === "hoch");
  assert.equal(hoch.length, 7);
  const ampel = Object.fromEntries(r.areas.map((a) => [a.id, a.ampel]));
  assert.equal(ampel.geheimnisse, "gruen");
  assert.equal(ampel.zugang_rechte, "rot");
  assert.equal(ampel.daten_datenschutz, "rot");
  assert.equal(ampel.code_bausteine, "rot");
});

test("03-zugriff-fehlt: kein Umbau-Hinweis (vier schwere Funde)", () => {
  const r = runCheck(join(fx, "03-zugriff-fehlt"));
  assert.equal(r.reviewHint, false);
});

test("06-stack-fremd: Ergebnis 5, keine Funde, kein Bereich geprüft", () => {
  const r = runCheck(join(fx, "06-stack-fremd"));
  assert.equal(r.result, "stack_nicht_unterstuetzt");
  assert.equal(r.stack.kind, "python");
  assert.equal(r.findings.length, 0);
  assert.ok(r.areas.every((a) => a.ampel === "offen"));
});

test("07-leer: Ergebnis 6, keine Funde, kein Bereich geprüft", () => {
  const r = runCheck(join(fx, "07-leer"));
  assert.equal(r.result, "nicht_pruefbar");
  assert.equal(r.findings.length, 0);
  assert.ok(r.areas.every((a) => a.ampel === "offen"));
});
