import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck } from "../src/check.ts";

const root = resolve(import.meta.dirname, "../..");
let fx: string; // materialized fixtures
let tmp: string; // synthetic projects

before(() => {
  fx = mkdtempSync(join(tmpdir(), "livedock-fx-"));
  execFileSync("bash", [join(root, "testprojekte/materialize.sh"), fx], { stdio: "pipe" });
  tmp = mkdtempSync(join(tmpdir(), "livedock-syn-"));
});

after(() => {
  rmSync(fx, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
});

test("01-sauber: Next.js, Supabase, Mistral, Eingabeprüfung", () => {
  const r = runCheck(join(fx, "01-sauber"));
  assert.equal(r.stack.status, "unterstuetzt");
  assert.equal(r.stack.kind, "nextjs");
  assert.equal(r.stack.features.supabase, true);
  assert.deepEqual(r.stack.features.ai, ["mistral"]);
  assert.equal(r.stack.features.validation, true);
  assert.equal(r.result, null);
});

test("02-schluessel-offen: Next.js, OpenAI", () => {
  const r = runCheck(join(fx, "02-schluessel-offen"));
  assert.equal(r.stack.kind, "nextjs");
  assert.deepEqual(r.stack.features.ai, ["openai"]);
});

test("03-zugriff-fehlt: Next.js, OpenAI, keine Eingabeprüfung", () => {
  const r = runCheck(join(fx, "03-zugriff-fehlt"));
  assert.equal(r.stack.kind, "nextjs");
  assert.deepEqual(r.stack.features.ai, ["openai"]);
  assert.equal(r.stack.features.validation, false);
});

test("Python/Django: Stack nicht unterstützt (Ergebnis 5)", () => {
  const d = join(tmp, "django");
  mkdirSync(d);
  writeFileSync(join(d, "manage.py"), "# fixture\n");
  writeFileSync(join(d, "requirements.txt"), "django\n");
  const r = runCheck(d);
  assert.equal(r.stack.status, "nicht_unterstuetzt");
  assert.equal(r.stack.kind, "python");
  assert.equal(r.result, "stack_nicht_unterstuetzt");
});

test("leeres Repo: nicht prüfbar (Ergebnis 6)", () => {
  const d = join(tmp, "leer");
  mkdirSync(d);
  const r = runCheck(d);
  assert.equal(r.stack.status, "leer");
  assert.equal(r.result, "nicht_pruefbar");
});

test("nur node_modules zählt nicht als Inhalt", () => {
  const d = join(tmp, "nur-vendor");
  mkdirSync(join(d, "node_modules/x"), { recursive: true });
  writeFileSync(join(d, "node_modules/x/index.js"), "");
  assert.equal(runCheck(d).stack.status, "leer");
});

test("kaputte package.json wird nicht als Node-Projekt gewertet", () => {
  const d = join(tmp, "kaputt");
  mkdirSync(d);
  writeFileSync(join(d, "package.json"), "{ not json");
  assert.equal(runCheck(d).stack.status, "nicht_unterstuetzt");
});

test("Bereiche bleiben 'offen', solange kein Modul geprüft hat", () => {
  const r = runCheck(join(fx, "01-sauber"));
  assert.ok(r.areas.every((a) => a.ampel === "offen"));
  assert.equal(r.areas.length, 5);
});

test("CLI: Ausgabe enthält weder Pfade noch Dateinamen der Testprojekte", () => {
  const out = execFileSync("node", [join(root, "engine/src/cli.ts"), "check", join(fx, "02-schluessel-offen")], {
    encoding: "utf8",
  });
  assert.match(out, /stack: nextjs/);
  assert.doesNotMatch(out, /ai\.ts|route\.ts|\.env|T3BlbkFJ|sk-/);
  assert.doesNotMatch(out, new RegExp(fx.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
