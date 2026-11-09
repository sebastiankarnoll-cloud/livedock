import type { Finding } from "../types.ts";
import type { Src } from "./load.ts";
import { lineOf } from "./load.ts";
import { isRoute } from "./access.ts";

// Area 5, own part: unsafe code patterns. Known vulnerabilities in used
// packages (osv-scanner) are NOT covered here; the area therefore never turns
// green, see check.ts.
//   body-unvalidated     request body goes straight into the database
//   eval-like            eval / new Function
//   shell-interpolation  exec with inserted values
//   sql-concatenation    SQL built from text
//   unsafe-html          unsanitized HTML in the page
//   tls-off              certificate check switched off

const VALID = /safeParse\(|\bz\.\w+\(|(?:schema|Schema)\.parse\(|validate\(/;
const TEST_FILE = /(^|\/)(__tests__|tests?|e2e)\/|\.(test|spec)\./;

interface Rule {
  id: string;
  re: RegExp;
  severity: Finding["severity"];
  kategorie: string;
  auswirkung: string;
  bereich: string;
  konfidenz: number;
  skipIf?: RegExp;
}

const RULES: Rule[] = [
  {
    id: "eval-like",
    re: /\beval\(\s*[^)'"`\s]|new\s+Function\(/,
    severity: "hoch",
    kategorie: "Text wird als Programmcode ausgeführt",
    auswirkung: "Eingeschleuste Befehle können auf dem Server laufen.",
    bereich: "Code",
    konfidenz: 0.85,
  },
  {
    id: "shell-interpolation",
    re: /\b(?:exec|execSync)\(\s*`[^`]*\$\{/,
    severity: "hoch",
    kategorie: "Systembefehl mit eingesetzten Werten",
    auswirkung: "Angreifer können über Eingaben Befehle auf dem Server ausführen.",
    bereich: "Code",
    konfidenz: 0.9,
  },
  {
    id: "sql-concatenation",
    re: /\.(?:query|execute)\(\s*`[^`]*\$\{|\$queryRawUnsafe\(|\$executeRawUnsafe\(/,
    severity: "hoch",
    kategorie: "Datenbankabfrage aus zusammengesetztem Text",
    auswirkung: "Angreifer können Datenbankabfragen manipulieren und Daten auslesen oder löschen (SQL-Injection).",
    bereich: "Code",
    konfidenz: 0.9,
  },
  {
    id: "unsafe-html",
    re: /dangerouslySetInnerHTML=\{\{\s*__html:(?!\s*["'`])/,
    severity: "mittel",
    kategorie: "Ungeprüftes HTML wird angezeigt",
    auswirkung: "Eingeschleuster Code kann bei Besuchern im Browser laufen (XSS).",
    bereich: "Code",
    konfidenz: 0.8,
    skipIf: /DOMPurify|sanitize/i,
  },
  {
    id: "tls-off",
    re: /rejectUnauthorized:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/,
    severity: "mittel",
    kategorie: "Zertifikatsprüfung abgeschaltet",
    auswirkung: "Verbindungen zu anderen Diensten können abgehört oder umgeleitet werden.",
    bereich: "Code",
    konfidenz: 0.9,
  },
];

export interface CodeScan {
  findings: Finding[];
  examined: boolean;
  bodyUnvalidated: boolean;
}

function make(r: Pick<Rule, "id" | "severity" | "kategorie" | "auswirkung" | "bereich" | "konfidenz">, hits: { rel: string; line: number }[]): Finding {
  const files = [...new Set(hits.map((h) => h.rel))];
  return {
    id: `code-${r.id}`,
    area: "code_bausteine",
    severity: r.severity,
    kategorie: r.kategorie,
    auswirkung: r.auswirkung,
    bereich: r.bereich,
    konfidenz: r.konfidenz,
    acute: false,
    intern: { datei: files.slice(0, 5).join(", ") + (files.length > 5 ? ` (+${files.length - 5})` : ""), zeile: hits[0].line, regel: r.id },
  };
}

export function scanCode(sources: Src[]): CodeScan {
  const findings: Finding[] = [];

  const body: { rel: string; line: number }[] = [];
  for (const s of sources) {
    if (!isRoute(s.rel, s.text) || VALID.test(s.text)) continue;
    const v = /const\s+(\w+)\s*=\s*await\s+(?:req|request)\.json\(\)/.exec(s.text);
    if (!v) continue;
    const n = v[1];
    const m = new RegExp(`\\.(?:insert|update|upsert)\\(\\s*\\[?\\s*(?:\\{\\s*\\.\\.\\.)?${n}\\b|data:\\s*${n}\\b`).exec(s.text);
    if (m) body.push({ rel: s.rel, line: lineOf(s.text, m.index) });
  }
  if (body.length) {
    findings.push(
      make(
        {
          id: "body-unvalidated",
          severity: "mittel",
          kategorie: "Eingaben werden nicht geprüft",
          auswirkung: "Fehlerhafte oder gezielt manipulierte Eingaben landen ungeprüft in der Datenbank.",
          bereich: "Schnittstelle",
          konfidenz: 0.9,
        },
        body,
      ),
    );
  }

  for (const r of RULES) {
    const hits: { rel: string; line: number }[] = [];
    for (const s of sources) {
      if (TEST_FILE.test(s.rel.split("\\").join("/")) || (r.skipIf && r.skipIf.test(s.text))) continue;
      const m = r.re.exec(s.text);
      if (m) hits.push({ rel: s.rel, line: lineOf(s.text, m.index) });
    }
    if (hits.length) findings.push(make(r, hits));
  }

  return { findings, examined: sources.length > 0, bodyUnvalidated: body.length > 0 };
}
