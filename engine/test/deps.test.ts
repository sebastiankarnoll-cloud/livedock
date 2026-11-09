import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditDependencies, parseAudit } from "../src/scanners/deps.ts";
import type { Runner } from "../src/scanners/deps.ts";
import { runCheck } from "../src/check.ts";

// npm test sets LIVEDOCK_AUDIT=off for the other files; these tests use a fake npm and need it on.
delete process.env.LIVEDOCK_AUDIT;

let tmp: string;
before(() => {
  tmp = mkdtempSync(join(tmpdir(), "livedock-deps-"));
});
after(() => rmSync(tmp, { recursive: true, force: true }));

function project(name: string, pkg: object, lock = false): string {
  const d = join(tmp, name);
  mkdirSync(join(d, "lib"), { recursive: true });
  writeFileSync(join(d, "package.json"), JSON.stringify(pkg));
  writeFileSync(join(d, "lib/a.js"), "module.exports = 1;\n");
  if (lock) writeFileSync(join(d, "package-lock.json"), "{}");
  return d;
}

const AUDIT = JSON.stringify({
  vulnerabilities: {
    minimist: { severity: "critical", isDirect: true },
    lodash: { severity: "high", isDirect: true },
    foo: { severity: "moderate", isDirect: false },
  },
});

/** Fake npm: records calls and the directories it ran in. Needs no network. */
function fake(audit: string, installOk = true) {
  const calls: { cwd: string; args: string[] }[] = [];
  const run: Runner = (cwd, args) => {
    calls.push({ cwd, args });
    if (args[0] === "install") return { stdout: "", status: installOk ? 0 : 1 };
    return { stdout: audit, status: 1 };
  };
  return { run, calls };
}

test("parseAudit: kritisch und hoch werden zu einem Fund, mittel getrennt, Namen nur intern", () => {
  const f = parseAudit(JSON.parse(AUDIT), 0.95);
  assert.deepEqual(f.map((x) => x.severity), ["hoch", "mittel"]);
  assert.match(f[0].kategorie, /^2 Bausteine mit bekannter Sicherheitslücke/);
  assert.doesNotMatch(JSON.stringify({ ...f[0], intern: undefined }), /minimist|lodash/);
  assert.match(f[0].intern!.detail!, /lodash.*minimist/);
});

test("parseAudit: keine Lücken = keine Funde", () => {
  assert.deepEqual(parseAudit({ vulnerabilities: {} }, 0.95), []);
});

test("Mit Lockfile: geprüft, hohe Konfidenz, nur Datendateien im Temp-Ordner, Lockfile wird nicht neu aufgelöst", () => {
  const d = project("lock", { dependencies: { lodash: "4.17.15" }, scripts: { postinstall: "evil" } }, true);
  const { run, calls } = fake(AUDIT);
  const r = auditDependencies(d, run);
  assert.equal(r.status, "geprueft");
  assert.equal(r.findings[0].konfidenz, 0.95);
  assert.ok(calls.every((c) => c.args[0] === "audit"));
  assert.ok(calls.every((c) => c.cwd !== d && !c.cwd.startsWith(d)), "never runs inside the project");
  assert.ok(!existsSync(calls[0].cwd), "temp dir removed");
});

test("Ohne Lockfile: Versionen geschätzt, Konfidenz unter der Schwelle, install ohne Skripte", () => {
  const d = project("nolock", { dependencies: { lodash: "^4.0.0" } });
  const { run, calls } = fake(AUDIT);
  const r = auditDependencies(d, run);
  assert.equal(r.status, "geschaetzt");
  assert.equal(r.findings[0].konfidenz, 0.6);
  assert.deepEqual(calls[0].args.slice(0, 2), ["install", "--package-lock-only"]);
  assert.ok(calls[0].args.includes("--ignore-scripts"));
  assert.match(r.note!, /geschätzt/);
});

test("Keine Bausteine: nichts zu prüfen, geprüft ohne Funde und ohne npm-Aufruf", () => {
  const { run, calls } = fake(AUDIT);
  const r = auditDependencies(project("nodeps", { name: "x" }), run);
  assert.equal(r.status, "geprueft");
  assert.equal(calls.length, 0);
});

test("Fehler (Netz, kaputte Ausgabe, kaputte package.json) = nicht möglich, nie grün", () => {
  const d = project("err", { dependencies: { a: "1.0.0" } }, true);
  assert.equal(auditDependencies(d, () => ({ stdout: "not json", status: 1 })).status, "nicht_moeglich");
  assert.equal(auditDependencies(d, () => ({ stdout: JSON.stringify({ error: { code: "ENOTFOUND" } }), status: 1 })).status, "nicht_moeglich");
  assert.equal(auditDependencies(project("noinst", { dependencies: { a: "1.0.0" } }), fake("{}", false).run).status, "nicht_moeglich");
  const bad = join(tmp, "badjson");
  mkdirSync(bad);
  writeFileSync(join(bad, "package.json"), "{ nope");
  assert.equal(auditDependencies(bad, fake("{}").run).status, "nicht_moeglich");
});

test("LIVEDOCK_AUDIT=off überspringt den Abgleich", () => {
  const { run, calls } = fake(AUDIT);
  const prev = process.env.LIVEDOCK_AUDIT;
  process.env.LIVEDOCK_AUDIT = "off";
  try {
    assert.equal(auditDependencies(project("off", { dependencies: { a: "1.0.0" } }), run).status, "uebersprungen");
  } finally {
    if (prev === undefined) delete process.env.LIVEDOCK_AUDIT;
    else process.env.LIVEDOCK_AUDIT = prev;
  }
  assert.equal(calls.length, 0);
});

// ---- Zusammenspiel mit runCheck ----

function withAudit<T>(fn: () => T): T {
  const prev = process.env.LIVEDOCK_AUDIT;
  delete process.env.LIVEDOCK_AUDIT;
  try {
    return fn();
  } finally {
    if (prev !== undefined) process.env.LIVEDOCK_AUDIT = prev;
  }
}
const area5 = (r: ReturnType<typeof runCheck>) => r.areas.find((a) => a.id === "code_bausteine")!;

test("Bereich 5 wird nur mit Lockfile und sauberem Abgleich grün", () => {
  const d = project("green", { dependencies: { lodash: "4.17.21" } }, true);
  const r = withAudit(() => runCheck(d, { auditRunner: fake(JSON.stringify({ vulnerabilities: {} })).run }));
  assert.equal(area5(r).ampel, "gruen");
  assert.ok(r.positives.includes("Bausteine ohne bekannte Sicherheitslücken"));
});

test("Bereich 5: ohne Lockfile oder bei Fehler höchstens 'teilweise geprüft'", () => {
  const nolock = project("p-nolock", { dependencies: { lodash: "^4.17.21" } });
  const clean = JSON.stringify({ vulnerabilities: {} });
  assert.equal(area5(withAudit(() => runCheck(nolock, { auditRunner: fake(clean).run }))).ampel, "teilweise");
  const lock = project("p-err", { dependencies: { lodash: "4.17.21" } }, true);
  assert.equal(area5(withAudit(() => runCheck(lock, { auditRunner: () => ({ stdout: "x", status: 1 }) }))).ampel, "teilweise");
});

test("Bereich 5: Funde aus geschätzten Versionen (ohne Lockfile) werden verworfen, Bereich bleibt 'teilweise'", () => {
  const d = project("p-est", { dependencies: { lodash: "^4.0.0" } });
  const r = withAudit(() => runCheck(d, { auditRunner: fake(AUDIT).run }));
  assert.deepEqual(r.findings.filter((f) => f.area === "code_bausteine"), []);
  assert.equal(area5(r).ampel, "teilweise");
  assert.match(area5(r).note!, /geschätzt/);
});

test("Bereich 5: Lücken geben rot, Gesamtergebnis Behebbar, Kundensicht ohne Baustein-Namen", () => {
  const d = project("p-vuln", { dependencies: { lodash: "4.17.15" } }, true);
  const r = withAudit(() => runCheck(d, { auditRunner: fake(AUDIT).run }));
  assert.equal(area5(r).ampel, "rot");
  assert.equal(r.result, "behebbar");
});
