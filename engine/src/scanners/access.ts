import { walkFiles, readText, isTestFile } from "./walk.ts";
import type { Finding } from "../types.ts";

// Area 2: access and permissions. Own rules, conservative on purpose
// (hard rule 3: only safe findings). Static reading only, nothing is executed.
//
// Rules:
//   route-without-auth      API route reads or writes data without any login check
//                           (and no middleware that checks login for /api)
//   table-without-rls       Supabase table created without row level security
//   service-key-open-route  service-role key used by a route without login check,
//                           or service-role key exposed via a NEXT_PUBLIC_ variable

export interface AccessScan {
  findings: Finding[];
  stats: { routes: number; authed: number; tables: number; tablesWithoutRls: number };
  /** false if there was nothing to look at (no routes, no migrations) */
  examined: boolean;
}

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const HANDLER = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/;
const DEFAULT_EXPORT = /export\s+default\b/;
const DATA_ACCESS = /\.from\(\s*["'`]|\bprisma\.\w+\.|\bdrizzle\b|\.query\(\s*["'`]|\bsql`/;
// Login checks of common libraries. Any of these counts as "route checks login".
const AUTH_CHECK =
  /auth\.getUser\(|auth\.getSession\(|getServerSession\(|\bauth\(\s*\)|currentUser\(|getToken\(|requireAuth|withAuth|jwtVerify|verifyJwt|getAuth\(|clerkClient/;
// Routes that authenticate by other means (webhooks, cron) are not findings.
const OTHER_AUTH = /constructEvent|x-hub-signature|x-signature|CRON_SECRET|[Aa]uthorization["'\]]|headers\(\)\.get\(\s*["']authorization/;
const SERVICE_ROLE = /SERVICE_ROLE/;
const PUBLIC_SERVICE_ROLE = /NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/;

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

export function isRoute(rel: string, text: string): { handlerIndex: number } | null {
  const p = rel.split("\\").join("/");
  const appRoute = /(^|\/)app\/(.*\/)?route\.(ts|tsx|js|jsx|mjs)$/.test(p);
  const pagesApi = /(^|\/)pages\/api\//.test(p) && SRC_EXT.test(p);
  if (!appRoute && !pagesApi) return null;
  const m = appRoute ? HANDLER.exec(text) : DEFAULT_EXPORT.exec(text);
  return m ? { handlerIndex: m.index } : null;
}

export function moduleName(rel: string): string {
  const p = rel.split("\\").join("/").replace(SRC_EXT, "");
  const parts = p.split("/");
  const last = parts[parts.length - 1];
  return last === "index" ? (parts[parts.length - 2] ?? last) : last;
}

export function importsModule(text: string, name: string): number {
  const re = /from\s+["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const path = m[1] ?? m[2];
    const seg = path.split("/").pop()!.replace(SRC_EXT, "");
    if (seg === name) return m.index;
  }
  return -1;
}

function middlewareCoversApi(files: { rel: string; text: string }[]): boolean {
  const mw = files.find((f) => /^(src\/)?middleware\.(ts|js)$/.test(f.rel.split("\\").join("/")));
  if (!mw || !AUTH_CHECK.test(mw.text) && !/clerkMiddleware|authMiddleware|withAuth/.test(mw.text)) return false;
  const m = /matcher\s*:\s*(\[[\s\S]*?\]|["'`][^"'`]*["'`])/.exec(mw.text);
  if (!m) return true; // no matcher: runs on every path
  const matcher = m[1];
  if (matcher.includes("/api")) return true;
  if (matcher.includes("(?!") && !/\(\?!.*\bapi\b/.test(matcher)) return true;
  return false;
}

interface Hit {
  datei: string;
  zeile: number;
}

function toFinding(
  rule: string,
  hits: Hit[],
  f: Pick<Finding, "kategorie" | "auswirkung" | "bereich" | "konfidenz">,
): Finding {
  const files = [...new Set(hits.map((h) => h.datei))];
  const shown = files.slice(0, 5).join(", ");
  return {
    id: `zugang-${rule}`,
    area: "zugang_rechte",
    severity: "hoch",
    ...f,
    acute: false,
    intern: { datei: shown + (files.length > 5 ? ` (+${files.length - 5})` : ""), zeile: hits[0].zeile, regel: rule },
  };
}

export function scanAccess(root: string, supabase: boolean): AccessScan {
  const sources: { rel: string; text: string }[] = [];
  const sqlFiles: { rel: string; text: string }[] = [];
  for (const f of walkFiles(root)) {
    const isSrc = SRC_EXT.test(f.name);
    const isSql = f.name.endsWith(".sql");
    if (!isSrc && !isSql) continue;
    if (isSrc && isTestFile(f.rel)) continue;
    const text = readText(f);
    if (text === null) continue;
    (isSql ? sqlFiles : sources).push({ rel: f.rel, text });
  }

  const covered = middlewareCoversApi(sources);
  const serviceModules = sources
    .filter((s) => SERVICE_ROLE.test(s.text) && !PUBLIC_SERVICE_ROLE.test(s.text))
    .map((s) => ({ rel: s.rel, name: moduleName(s.rel) }));

  const noAuth: Hit[] = [];
  const serviceOpen: Hit[] = [];
  let routes = 0;
  let authed = 0;

  for (const s of sources) {
    const r = isRoute(s.rel, s.text);
    if (!r) continue;
    routes++;
    if (covered || AUTH_CHECK.test(s.text)) authed++;
    if (covered || AUTH_CHECK.test(s.text) || OTHER_AUTH.test(s.text)) continue;
    const usesService = SERVICE_ROLE.test(s.text) || serviceModules.some((m) => m.rel !== s.rel && importsModule(s.text, m.name) >= 0);
    // A route without login check only matters if it touches data, directly or via the service client.
    if (!DATA_ACCESS.test(s.text) && !usesService) continue;
    const hit = { datei: s.rel, zeile: lineOf(s.text, r.handlerIndex) };
    noAuth.push(hit);
    if (usesService) serviceOpen.push(hit);
  }

  const findings: Finding[] = [];
  if (noAuth.length) {
    findings.push(
      toFinding("route-without-auth", noAuth, {
        kategorie: "Schnittstelle ohne Anmeldeprüfung",
        auswirkung: "Jeder, der die Adresse kennt, kann Daten lesen oder ändern.",
        bereich: "Schnittstelle",
        konfidenz: 0.9,
      }),
    );
  }

  // RLS only exists in Supabase / Postgres projects that use it.
  let tables = 0;
  let tablesWithoutRls = 0;
  if (supabase) {
    const missing: Hit[] = [];
    for (const s of sqlFiles) {
      const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(\w+)\.)?"?(\w+)"?/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s.text))) {
        const schema = m[1]?.toLowerCase();
        if (schema && schema !== "public") continue;
        tables++;
        const name = m[2];
        const rls = new RegExp(`alter\\s+table\\s+(?:only\\s+)?(?:public\\.)?"?${name}"?\\s+enable\\s+row\\s+level\\s+security`, "i");
        if (!sqlFiles.some((x) => rls.test(x.text))) missing.push({ datei: s.rel, zeile: lineOf(s.text, m.index) });
      }
    }
    tablesWithoutRls = missing.length;
    if (missing.length) {
      findings.push(
        toFinding("table-without-rls", missing, {
          kategorie: "Datenbank-Tabelle ohne Zugriffsregeln",
          auswirkung: "Die Tabelle ist mit dem öffentlichen Schlüssel der Datenbank für jeden lesbar und änderbar.",
          bereich: "Datenbank",
          konfidenz: 0.95,
        }),
      );
    }
  }

  const exposed: Hit[] = [];
  for (const s of sources) {
    const m = PUBLIC_SERVICE_ROLE.exec(s.text);
    if (m) exposed.push({ datei: s.rel, zeile: lineOf(s.text, m.index) });
  }
  const serviceHits = [...serviceOpen, ...exposed];
  if (serviceHits.length) {
    findings.push(
      toFinding("service-key-open-route", serviceHits, {
        kategorie: "Universalschlüssel der Datenbank ungeschützt eingesetzt",
        auswirkung: "Der Zugang umgeht alle Datenbank-Regeln. Ohne Anmeldeprüfung davor ist der gesamte Datenbestand offen.",
        bereich: "Datenbank",
        konfidenz: 0.9,
      }),
    );
  }

  return { findings, stats: { routes, authed, tables, tablesWithoutRls }, examined: routes > 0 || tables > 0 };
}
