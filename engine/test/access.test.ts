import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck, publicView } from "../src/check.ts";

const root = resolve(import.meta.dirname, "../..");
let fx: string;
let tmp: string;

before(() => {
  fx = mkdtempSync(join(tmpdir(), "livedock-fx-"));
  execFileSync("bash", [join(root, "testprojekte/materialize.sh"), fx], { stdio: "pipe" });
  tmp = mkdtempSync(join(tmpdir(), "livedock-acc-"));
});
after(() => {
  rmSync(fx, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
});

function project(name: string, files: Record<string, string>, supabase = true): string {
  const d = join(tmp, name);
  mkdirSync(d, { recursive: true });
  const deps: Record<string, string> = { next: "^15.0.0" };
  if (supabase) deps["@supabase/supabase-js"] = "^2.0.0";
  writeFileSync(join(d, "package.json"), JSON.stringify({ dependencies: deps }));
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(join(d, f, ".."), { recursive: true });
    writeFileSync(join(d, f), content);
  }
  return d;
}
const rules = (d: string) =>
  runCheck(d).findings.filter((f) => f.area === "zugang_rechte").map((f) => f.intern?.regel).sort();
const ampel = (d: string) => runCheck(d).areas.find((a) => a.id === "zugang_rechte")!.ampel;

const OPEN_ROUTE = 'import { db } from "@/lib/db";\nexport async function GET() { return db.from("x").select("*"); }\n';
const AUTH_ROUTE = 'export async function GET() { const { data } = await supabase.auth.getUser(); if (!data.user) return null; return supabase.from("x").select("*"); }\n';

test("01: grün, keine Funde", () => {
  assert.deepEqual(rules(join(fx, "01-sauber")), []);
  assert.equal(ampel(join(fx, "01-sauber")), "gruen");
});

test("02: Zugang grün (Login in der Route, Regeln mit Policy)", () => {
  assert.deepEqual(rules(join(fx, "02-schluessel-offen")), []);
  assert.equal(ampel(join(fx, "02-schluessel-offen")), "gruen");
});

test("03: rot, genau drei Funde, nicht akut", () => {
  const d = join(fx, "03-zugriff-fehlt");
  assert.deepEqual(rules(d), ["route-without-auth", "service-key-open-route", "table-without-rls"]);
  assert.equal(ampel(d), "rot");
  assert.equal(runCheck(d).acute, false);
});

test("03: Kundensicht ohne Datei, Zeile, Regel", () => {
  const json = JSON.stringify(publicView(runCheck(join(fx, "03-zugriff-fehlt"))));
  assert.doesNotMatch(json, /"datei"|"zeile"|"regel"|route\.ts|001_tables|db\.ts/);
});

test("Route mit Login-Prüfung ist kein Fund", () => {
  assert.deepEqual(rules(project("auth-ok", { "app/api/x/route.ts": AUTH_ROUTE })), []);
});

test("Route ohne Datenzugriff (Health-Check) ist kein Fund", () => {
  assert.deepEqual(rules(project("health", { "app/api/health/route.ts": "export async function GET() { return Response.json({ ok: true }); }\n" })), []);
});

test("Webhook mit Signaturprüfung und Cron mit Geheimnis sind keine Funde", () => {
  const d = project("webhook", {
    "app/api/stripe/route.ts": 'export async function POST(r: Request) { const e = stripe.webhooks.constructEvent(b, sig, s); await supabase.from("o").insert(e); }\n',
    "app/api/cron/route.ts": 'export async function GET(r: Request) { if (r.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return null; await supabase.from("o").delete(); }\n',
  });
  assert.deepEqual(rules(d), []);
});

test("Middleware mit Login-Prüfung für /api deckt Routen ab", () => {
  const mw = 'export async function middleware(r) { const { data } = await supabase.auth.getUser(); }\nexport const config = { matcher: ["/api/:path*"] };\n';
  assert.deepEqual(rules(project("mw-api", { "middleware.ts": mw, "app/api/x/route.ts": OPEN_ROUTE.replace('import { db } from "@/lib/db";', "") })), []);
});

test("Middleware nur für /dashboard deckt /api nicht ab", () => {
  const mw = 'export async function middleware(r) { const { data } = await supabase.auth.getUser(); }\nexport const config = { matcher: ["/dashboard/:path*"] };\n';
  assert.deepEqual(rules(project("mw-other", { "middleware.ts": mw, "app/api/x/route.ts": 'export async function GET() { return supabase.from("x").select("*"); }\n' })), ["route-without-auth"]);
});

test("pages/api ohne Login-Prüfung wird erkannt", () => {
  const d = project("pages-api", { "pages/api/x.ts": 'export default async function handler(req, res) { res.json(await supabase.from("x").select("*")); }\n' });
  assert.deepEqual(rules(d), ["route-without-auth"]);
});

test("Tabelle ohne RLS wird erkannt, Tabelle mit RLS nicht", () => {
  const sql = "create table a (id int);\ncreate table b (id int);\nalter table a enable row level security;\n";
  const r = runCheck(project("rls-one", { "supabase/migrations/1.sql": sql }));
  assert.deepEqual(r.findings.map((f) => f.intern?.regel), ["table-without-rls"]);
});

test("RLS in einer späteren Migration zählt", () => {
  const d = project("rls-later", {
    "supabase/migrations/1.sql": "create table a (id int);\n",
    "supabase/migrations/2.sql": "alter table public.a enable row level security;\n",
  });
  assert.deepEqual(rules(d), []);
});

test("Tabellen in anderen Schemas (auth, storage) werden ignoriert", () => {
  assert.deepEqual(rules(project("schema", { "supabase/migrations/1.sql": "create table auth.x (id int);\n" })), []);
});

test("Ohne Supabase wird RLS nicht verlangt", () => {
  assert.deepEqual(rules(project("no-supabase", { "db/schema.sql": "create table a (id int);\n" }, false)), []);
});

test("Service-Key im Server ohne offene Route ist kein Fund", () => {
  const d = project("service-ok", {
    "lib/admin.ts": 'export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);\n',
    "app/api/x/route.ts": AUTH_ROUTE,
  });
  assert.deepEqual(rules(d), []);
});

test("Service-Key als NEXT_PUBLIC-Variable ist ein Fund", () => {
  const d = project("service-public", { "lib/c.ts": 'const k = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;\n' });
  assert.deepEqual(rules(d), ["service-key-open-route"]);
});

test("Nichts Prüfbares gefunden: Bereich bleibt offen, nicht grün", () => {
  const d = project("nothing", { "app/page.tsx": "export default function P() { return null; }\n" });
  assert.equal(ampel(d), "offen");
});
