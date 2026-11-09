import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck, publicView } from "../src/check.ts";

const root = resolve(import.meta.dirname, "../..");
const cli = join(root, "engine/src/cli.ts");
let fx: string;
let tmp: string;

// Same fake key as materialize.sh, assembled from parts.
const FAKE_KEY = ["sk-TESTONLYTESTONLY1234", "T3Blbk", "FJTESTONLYTESTONLY5678"].join("");

before(() => {
  fx = mkdtempSync(join(tmpdir(), "livedock-fx-"));
  execFileSync("bash", [join(root, "testprojekte/materialize.sh"), fx], { stdio: "pipe" });
  tmp = mkdtempSync(join(tmpdir(), "livedock-syn-"));
});
after(() => {
  rmSync(fx, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
});

function project(name: string, files: Record<string, string>): string {
  const d = join(tmp, name);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "package.json"), JSON.stringify({ dependencies: { next: "^15.0.0" } }));
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(join(d, f, ".."), { recursive: true });
    writeFileSync(join(d, f), content);
  }
  return d;
}

test("02: Schlüssel, .env und DB-Passwort werden gefunden, Bereich rot, akut", () => {
  const r = runCheck(join(fx, "02-schluessel-offen"));
  assert.equal(r.areas.find((a) => a.id === "geheimnisse")!.ampel, "rot");
  assert.equal(r.acute, true);
  const rules = r.findings.map((f) => f.intern?.regel).sort();
  assert.deepEqual(rules, ["db-url-with-password", "env-file", "openai-key"]);
});

test("02: Schlüssel nur maskiert", () => {
  const r = runCheck(join(fx, "02-schluessel-offen"));
  const key = r.findings.find((f) => f.intern?.regel === "openai-key")!;
  assert.equal(key.hinweis, "sk-…5678");
  assert.equal(key.acute, true);
});

test("01 und 03: keine Geheimnis-Funde, Bereich grün", () => {
  for (const p of ["01-sauber", "03-zugriff-fehlt"]) {
    const r = runCheck(join(fx, p));
    assert.deepEqual(r.findings.filter((f) => f.area === "geheimnisse"), [], p);
    assert.equal(r.areas.find((a) => a.id === "geheimnisse")!.ampel, "gruen", p);
    assert.equal(r.acute, false, p);
  }
});

test("Kundensicht enthält weder Datei, Zeile noch Regel", () => {
  const v = publicView(runCheck(join(fx, "02-schluessel-offen")));
  const json = JSON.stringify(v);
  assert.ok(v.findings.length === 3);
  assert.doesNotMatch(json, /"datei"|"zeile"|"regel"|"intern"|ai\.ts|route\.ts/);
});

test("Kein Schlüssel im Klartext in irgendeiner Ausgabe (JSON, Text, intern)", () => {
  const dir = join(fx, "02-schluessel-offen");
  for (const flags of [[], ["--json"], ["--intern"], ["--json", "--intern"]]) {
    const out = execFileSync("node", [cli, "check", dir, ...flags], { encoding: "utf8" });
    assert.ok(!out.includes(FAKE_KEY), `key leaked with ${flags.join(" ") || "default"}`);
    assert.ok(!out.includes("TESTONLY-password-123"), "db password leaked");
    assert.ok(!out.includes("TESTONLYTESTONLY1234"), "key part leaked");
  }
});

test("--intern zeigt Datei und Zeile, Standard nicht", () => {
  const dir = join(fx, "02-schluessel-offen");
  const std = execFileSync("node", [cli, "check", dir], { encoding: "utf8" });
  const intern = execFileSync("node", [cli, "check", dir, "--intern"], { encoding: "utf8" });
  assert.doesNotMatch(std, /ai\.ts|intern:/);
  assert.match(intern, /ai\.ts:\d+/);
});

test(".env, das per .gitignore ausgeschlossen ist, ist kein Fund", () => {
  const d = project("env-ignored", { ".gitignore": ".env\nnode_modules\n", ".env": "API_URL=https://x.example\nTOKEN=abc123\n" });
  assert.deepEqual(runCheck(d).findings.filter((f) => f.area === "geheimnisse"), []);
});

test(".env mit echtem Wert ohne .gitignore ist ein Fund (nicht akut)", () => {
  const d = project("env-open", { ".env": "TOKEN=abc123\n" });
  const r = runCheck(d);
  r.findings = r.findings.filter((f) => f.area === "geheimnisse");
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].acute, false);
  assert.equal(r.acute, false);
  assert.equal(r.areas.find((a) => a.id === "geheimnisse")!.ampel, "rot");
});

test("Vorlagen und leere/Platzhalter-Werte sind keine Funde", () => {
  const d = project("templates", {
    ".env.example": "OPENAI_API_KEY=\nDATABASE_URL=postgresql://user:changeme@localhost:5432/db\n",
    ".env": "OPENAI_API_KEY=\nEMPTY=\n# comment\n",
    "src/db.ts": 'const url = "postgresql://user:password@localhost:5432/app";\n',
  });
  assert.deepEqual(runCheck(d).findings.filter((f) => f.area === "geheimnisse"), []);
});

test("Keine Funde in node_modules", () => {
  const d = project("vendor", { "node_modules/x/index.js": `const k = "${FAKE_KEY}";\n` });
  assert.deepEqual(runCheck(d).findings.filter((f) => f.area === "geheimnisse"), []);
});

test("Private Schlüssel werden erkannt, Hinweis ohne Inhalt", () => {
  const d = project("pem", { "keys/server.pem": "-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----\n" });
  const r = runCheck(d);
  r.findings = r.findings.filter((f) => f.area === "geheimnisse");
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].hinweis, "private key");
  assert.equal(r.acute, true);
});

test("Binärdateien werden übersprungen", () => {
  const d = project("bin", {});
  writeFileSync(join(d, "logo.png"), Buffer.concat([Buffer.from([0, 1, 2, 3]), Buffer.from(FAKE_KEY)]));
  assert.deepEqual(runCheck(d).findings.filter((f) => f.area === "geheimnisse"), []);
});

test("CLI: nicht vorhandener Pfad ist ein Fehler (Exit 2)", () => {
  const r = spawnSync("node", [cli, "check", join(tmp, "gibt-es-nicht")], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not found/);
});
