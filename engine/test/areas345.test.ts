import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck, publicView } from "../src/check.ts";
import type { AreaId } from "../src/types.ts";

const root = resolve(import.meta.dirname, "../..");
let fx: string;
let tmp: string;

before(() => {
  fx = mkdtempSync(join(tmpdir(), "livedock-fx-"));
  execFileSync("bash", [join(root, "testprojekte/materialize.sh"), fx], { stdio: "pipe" });
  tmp = mkdtempSync(join(tmpdir(), "livedock-a345-"));
});
after(() => {
  rmSync(fx, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
});

function project(name: string, files: Record<string, string>, deps: Record<string, string> = {}): string {
  const d = join(tmp, name);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "package.json"), JSON.stringify({ dependencies: { next: "^15.0.0", ...deps } }));
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(join(d, f, ".."), { recursive: true });
    writeFileSync(join(d, f), content);
  }
  return d;
}
const rules = (d: string, area: AreaId) =>
  runCheck(d).findings.filter((f) => f.area === area).map((f) => f.intern?.regel).sort();
const ampel = (d: string, area: AreaId) => runCheck(d).areas.find((a) => a.id === area)!.ampel;

// ---- Testprojekte gegen EXPECTED.md ----

test("01: Bereiche 3, 4, 5 ohne Funde, Gesamt 1, mindestens 2 Positives", () => {
  const r = runCheck(join(fx, "01-sauber"));
  assert.deepEqual(r.findings, []);
  assert.equal(r.result, "gut_aufgestellt");
  assert.ok(r.positives.length >= 2);
});

test("02: Gesamt 4 (akut), darunter 2; Bereich 3 grün, Bereich 4 gelb; Bereich 5 ohne Funde", () => {
  const d = join(fx, "02-schluessel-offen");
  const r = runCheck(d);
  assert.equal(r.result, "akuter_fund");
  assert.equal(r.basis, "behebbar");
  assert.equal(ampel(d, "daten_datenschutz"), "gruen");
  assert.equal(ampel(d, "ki_anbindung"), "gelb");
  assert.deepEqual(rules(d, "ki_anbindung"), ["no-rate-limit", "outside-eu"]);
  assert.deepEqual(rules(d, "code_bausteine"), []);
});

test("03: Gesamt 2 (nicht 3!), Bereiche 3 bis 5 wie erwartet", () => {
  const d = join(fx, "03-zugriff-fehlt");
  const r = runCheck(d);
  assert.equal(r.result, "behebbar");
  assert.equal(r.reviewHint, false);
  assert.deepEqual(rules(d, "daten_datenschutz"), ["personal-data-to-third-country"]);
  assert.deepEqual(rules(d, "ki_anbindung"), ["input-in-prompt", "no-rate-limit"]);
  assert.deepEqual(rules(d, "code_bausteine"), ["body-unvalidated"]);
  assert.equal(ampel(d, "code_bausteine"), "gelb");
});

test("Kundensicht von 03 ohne Datei, Zeile, Regel", () => {
  const json = JSON.stringify(publicView(runCheck(join(fx, "03-zugriff-fehlt"))));
  assert.doesNotMatch(json, /"datei"|"zeile"|"regel"|route\.ts|001_tables|db\.ts/);
});

// ---- Bereich 3 ----

const OPENAI = 'import OpenAI from "openai";\nconst c = new OpenAI();\n';
const CALL = 'await c.chat.completions.create({ model: "x", messages: [] });\n';

test("3: Personenfelder an OpenAI = Fund; nur Kurstitel = kein Fund", () => {
  const bad = project("d-bad", { "app/api/a/route.ts": OPENAI + 'export async function POST() { await db.from("p").select("name, email"); ' + CALL + "}\n" });
  assert.deepEqual(rules(bad, "daten_datenschutz"), ["personal-data-to-third-country"]);
  const ok = project("d-ok", { "app/api/a/route.ts": OPENAI + 'export async function POST() { await db.from("c").select("title"); ' + CALL + "}\n" });
  assert.deepEqual(rules(ok, "daten_datenschutz"), []);
});

test("3: Personenfelder an Mistral (EU) = kein Fund", () => {
  const d = project("d-eu", {
    "app/api/a/route.ts": 'import { Mistral } from "@mistralai/mistralai";\nexport async function POST() { await db.from("p").select("name, email"); await m.chat.complete({}); }\n',
  });
  assert.deepEqual(rules(d, "daten_datenschutz"), []);
});

test("3: Region oder eigener Endpunkt konfiguriert = kein Fund (nicht sicher genug)", () => {
  const d = project("d-region", {
    "app/api/a/route.ts": OPENAI + 'const c2 = new OpenAI({ baseURL: "https://x.example/eu" });\nexport async function POST() { await db.from("p").select("email"); ' + CALL + "}\n",
  });
  assert.deepEqual(rules(d, "daten_datenschutz"), []);
});

test("3: Personenfelder ohne KI-Aufruf sind kein Fund", () => {
  const d = project("d-noai", { "app/api/a/route.ts": 'export async function GET() { return db.from("p").select("name, email"); }\n' });
  assert.deepEqual(rules(d, "daten_datenschutz"), []);
});

test("3: E-Mail oder Passwort im Log = Fund, Text mit dem Wort = kein Fund", () => {
  const bad = project("d-log", { "lib/a.ts": "console.log(user.email);\n", "lib/b.ts": "console.log(`login ${password}`);\n" });
  assert.deepEqual(rules(bad, "daten_datenschutz"), ["personal-data-in-logs"]);
  const ok = project("d-log-ok", { "lib/a.ts": 'console.log("email sent");\n' });
  assert.deepEqual(rules(ok, "daten_datenschutz"), []);
});

test("3: Tracking ohne Einwilligung = Fund, mit Einwilligungstool = kein Fund", () => {
  const t = '<script src="https://www.googletagmanager.com/gtag/js">';
  const bad = project("d-track", { "app/layout.tsx": `export default () => '${t}';\n` });
  assert.deepEqual(rules(bad, "daten_datenschutz"), ["tracking-without-consent"]);
  const ok = project("d-track-ok", { "app/layout.tsx": `export default () => '${t}';\n`, "lib/c.ts": 'import "cookiebot";\n' });
  assert.deepEqual(rules(ok, "daten_datenschutz"), []);
});

// ---- Bereich 4 ----

test("4: Nutzereingabe im Prompt: Fund ohne Prüfung, kein Fund mit zod", () => {
  const body = 'const { q } = await req.json();\n';
  const bad = project("k-inj", { "app/api/a/route.ts": OPENAI + `export async function POST(req) { ${body} await c.chat.completions.create({ messages: [{ role: "user", content: \`Task: \${q}\` }] }); }\n` });
  assert.ok(rules(bad, "ki_anbindung").includes("input-in-prompt"));
  const ok = project("k-inj-ok", { "app/api/a/route.ts": OPENAI + `export async function POST(req) { ${body} const p = z.string().max(200).safeParse(q); await c.chat.completions.create({ messages: [{ role: "user", content: \`Task: \${q}\` }] }); }\n` });
  assert.ok(!rules(ok, "ki_anbindung").includes("input-in-prompt"));
});

test("4: Limit in der Middleware zählt", () => {
  const d = project("k-mw", {
    "middleware.ts": "export const r = ratelimit;\n",
    "app/api/a/route.ts": OPENAI + "export async function POST() { " + CALL + "}\n",
  });
  assert.ok(!rules(d, "ki_anbindung").includes("no-rate-limit"));
});

test("4: KI-Schlüssel als NEXT_PUBLIC-Variable = Fund (hoch, nicht akut)", () => {
  const d = project("k-pub", { "lib/a.ts": "const k = process.env.NEXT_PUBLIC_OPENAI_API_KEY;\n" });
  const f = runCheck(d).findings.find((x) => x.intern?.regel === "public-ai-key")!;
  assert.equal(f.severity, "hoch");
  assert.equal(f.acute, false);
});

test("4: Kein KI-Dienst im Projekt = grün mit Hinweis; KI-Bibliothek ohne erkennbaren Aufruf = offen", () => {
  assert.equal(ampel(project("k-none", { "lib/a.ts": "export const x = 1;\n" }), "ki_anbindung"), "gruen");
  assert.equal(ampel(project("k-lib", { "lib/a.ts": "export const x = 1;\n" }, { openai: "^5.0.0" }), "ki_anbindung"), "offen");
});

// ---- Bereich 5 ----

test("5: Gefährliche Muster werden erkannt", () => {
  const d = project("c-bad", {
    "lib/a.ts": "const r = eval(input);\n",
    "lib/b.ts": "exec(`convert ${file}`);\n",
    "lib/c.ts": "db.query(`select * from t where id = ${id}`);\n",
    "app/p.tsx": "export default () => <div dangerouslySetInnerHTML={{ __html: html }} />;\n",
    "lib/d.ts": "const a = { rejectUnauthorized: false };\n",
  });
  assert.deepEqual(rules(d, "code_bausteine"), ["eval-like", "shell-interpolation", "sql-concatenation", "tls-off", "unsafe-html"]);
});

test("5: Feste Texte, bereinigtes HTML und Testdateien sind kein Fund", () => {
  const d = project("c-ok", {
    "app/p.tsx": 'export default () => <div dangerouslySetInnerHTML={{ __html: "<b>x</b>" }} />;\n',
    "app/q.tsx": "import DOMPurify from 'dompurify';\nexport default () => <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(h) }} />;\n",
    "lib/a.test.ts": "eval(x);\n",
    "lib/b.ts": 'db.query("select 1");\n',
  });
  assert.deepEqual(rules(d, "code_bausteine"), []);
});

test("5: Nie grün: ohne Funde 'teilweise', mit Funden gelb oder rot", () => {
  assert.equal(ampel(project("c-partial", { "lib/a.ts": "export const x = 1;\n" }), "code_bausteine"), "teilweise");
  assert.equal(ampel(project("c-red", { "lib/a.ts": "eval(x);\n" }), "code_bausteine"), "rot");
});

test("5: Body mit Prüfung in die Datenbank = kein Fund", () => {
  const d = project("c-body-ok", {
    "app/api/a/route.ts": "export async function POST(req) { const body = await req.json(); const p = S.safeParse(body); await db.from('x').insert(body); }\n",
  });
  assert.deepEqual(rules(d, "code_bausteine"), []);
});

// ---- Gesamtergebnis ----

test("Ergebnis: Befund ohne akut = 2; ohne Funde aber Bereich offen = kein Urteil", () => {
  assert.equal(runCheck(project("r-two", { "lib/a.ts": "eval(x);\n" })).result, "behebbar");
  const open = runCheck(project("r-open", { "lib/a.ts": "export const x = 1;\n" }));
  assert.equal(open.findings.length, 0);
  assert.equal(open.result, null); // Zugang und Rechte war nicht prüfbar, kein "gut aufgestellt"
});

test("Ergebnis: 'Umbau nötig' setzt die Engine nie selbst, viele schwere Funde ergeben nur einen Hinweis", () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 6; i++) files[`lib/e${i}.ts`] = "eval(x);\n";
  // eval-like is one aggregated finding, so build six distinct severe findings instead
  const d = project("r-review", {
    "lib/a.ts": "eval(x);\nexec(`a ${b}`);\ndb.query(`select ${c}`);\n",
    "app/api/a/route.ts": 'import { db } from "@/lib/db";\nexport async function GET() { return db.from("x").select("*"); }\n',
    "lib/db.ts": "export const db = createClient(u, process.env.SUPABASE_SERVICE_ROLE_KEY);\n",
    "lib/c.ts": "const k = process.env.NEXT_PUBLIC_OPENAI_API_KEY;\n",
    "supabase/migrations/1.sql": "create table t (id int);\n",
  }, { "@supabase/supabase-js": "^2.0.0" });
  const r = runCheck(d);
  assert.ok(r.findings.filter((f) => f.severity === "hoch").length >= 6);
  assert.equal(r.reviewHint, true);
  assert.equal(r.result, "behebbar");
  assert.notEqual(r.result, "umbau_noetig");
});

test("Fortschritt: onStep meldet Stack und alle fünf Bereiche in fester Reihenfolge", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { runCheck } = await import("../src/check.ts");
  const out = mkdtempSync(join(tmpdir(), "livedock-step-"));
  execFileSync("bash", [resolve(import.meta.dirname, "../../testprojekte/materialize.sh"), out], { stdio: "pipe" });
  const seen: string[] = [];
  runCheck(join(out, "03-zugriff-fehlt"), { onStep: (id) => seen.push(id) });
  assert.deepEqual(seen, ["stack", "geheimnisse", "zugang_rechte", "daten_datenschutz", "ki_anbindung", "code_bausteine"]);
});

test("Testdateien werden von den Code-Regeln übersprungen, der Geheimnis-Scan nicht", () => {
  const out = mkdtempSync(join(tmpdir(), "livedock-tf-"));
  const files: Record<string, string> = {
    "package.json": '{"dependencies":{"next":"15.0.0"}}',
    "lib/x.test.ts": 'const k = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;\nconsole.log(user.password);\n',
    "test/y.ts": "const k = process.env.NEXT_PUBLIC_OPENAI_API_KEY;\n",
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(out, rel, ".."), { recursive: true });
    writeFileSync(join(out, rel), text);
  }
  assert.deepEqual(runCheck(out).findings, []);
  // the same text in a normal file is still found
  writeFileSync(join(out, "lib/z.ts"), "const k = process.env.NEXT_PUBLIC_OPENAI_API_KEY;\n");
  assert.ok(runCheck(out).findings.some((f) => f.intern?.regel === "public-ai-key"));
});
