import type { Finding } from "../types.ts";
import type { Src } from "./load.ts";
import { lineOf } from "./load.ts";
import type { AiRoute, AiFile } from "./aiusage.ts";

// Area 3: data and data protection. Conservative rules only (hard rule 3).
//   personal-data-to-third-country  personal fields are read in a file/route that sends data to
//                                   an AI provider outside the EU
//   personal-data-in-logs           console.log of email/password/iban values
//   tracking-without-consent        known tracking scripts and no sign of a consent tool

const STRONG_PERSONAL = /\b(email|e_?mail|phone|telefon|address|adresse|iban|birth\w*|geburt\w*|first_?name|last_?name|vorname|nachname)\b/i;
const SELECT = /\.select\(\s*(["'`])([^"'`]*)\1/g;
const LOG_PERSONAL = /console\.\w+\([^)]*(?:\.(?:email|password|iban)\b|\$\{\s*(?:\w+\.)*(?:email|password|iban)\b)/;
const TRACKER = /googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|static\.hotjar\.com|snap\.licdn\.com|analytics\.tiktok\.com/;
const CONSENT = /cookiebot|usercentrics|klaro|cookieyes|consent/i;

export interface DataScan {
  findings: Finding[];
  examined: boolean;
  /** AI files that receive personal data (area 4 must not report them a second time) */
  personalToAi: Set<string>;
}

function make(rule: string, f: Omit<Finding, "id" | "area" | "acute" | "intern">, files: string[], zeile: number): Finding {
  const uniq = [...new Set(files)];
  return {
    id: `daten-${rule}`,
    area: "daten_datenschutz",
    acute: false,
    ...f,
    intern: { datei: uniq.slice(0, 5).join(", ") + (uniq.length > 5 ? ` (+${uniq.length - 5})` : ""), zeile, regel: rule },
  };
}

export function scanData(sources: Src[], aiFiles: AiFile[], aiRoutes: AiRoute[]): DataScan {
  const findings: Finding[] = [];
  const personalToAi = new Set<string>();

  // Files that see personal fields and lead to an AI call outside the EU.
  const candidates: { file: Src; via: AiFile[] }[] = [
    ...aiFiles.map((a) => ({ file: a as Src, via: [a] })),
    ...aiRoutes.filter((r) => !aiFiles.some((a) => a.rel === r.route.rel)).map((r) => ({ file: r.route, via: r.via })),
  ];
  const hits: { rel: string; line: number }[] = [];
  for (const c of candidates) {
    if (!c.via.some((a) => a.outsideEu)) continue;
    SELECT.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SELECT.exec(c.file.text))) {
      if (m[2].trim() !== "*" && STRONG_PERSONAL.test(m[2])) {
        hits.push({ rel: c.file.rel, line: lineOf(c.file.text, m.index) });
        for (const a of c.via) if (a.outsideEu) personalToAi.add(a.rel);
        break;
      }
    }
  }
  if (hits.length) {
    findings.push(
      make(
        "personal-data-to-third-country",
        {
          severity: "hoch",
          kategorie: "Personendaten gehen an einen KI-Dienst außerhalb der EU",
          auswirkung: "Namen, E-Mail-Adressen oder ähnliche Angaben verlassen die EU. Dafür braucht es einen Vertrag und eine Rechtsgrundlage, sonst droht ein Datenschutzverstoß.",
          bereich: "KI-Anbindung",
          konfidenz: 0.85,
        },
        hits.map((h) => h.rel),
        hits[0].line,
      ),
    );
  }

  const logHits: { rel: string; line: number }[] = [];
  for (const s of sources) {
    const m = LOG_PERSONAL.exec(s.text);
    if (m) logHits.push({ rel: s.rel, line: lineOf(s.text, m.index) });
  }
  if (logHits.length) {
    findings.push(
      make(
        "personal-data-in-logs",
        {
          severity: "mittel",
          kategorie: "Personendaten oder Passwörter in Protokollen",
          auswirkung: "Sensible Angaben landen in Server-Protokollen und sind dort für viele Personen lesbar.",
          bereich: "Code",
          konfidenz: 0.85,
        },
        logHits.map((h) => h.rel),
        logHits[0].line,
      ),
    );
  }

  const trackers = sources.filter((s) => TRACKER.test(s.text));
  if (trackers.length && !sources.some((s) => CONSENT.test(s.text))) {
    const m = TRACKER.exec(trackers[0].text)!;
    findings.push(
      make(
        "tracking-without-consent",
        {
          severity: "mittel",
          kategorie: "Tracking-Dienst ohne erkennbare Einwilligung",
          auswirkung: "Besucherdaten gehen an Dritte, ohne dass eine Einwilligungsabfrage erkennbar ist.",
          bereich: "Webseite",
          konfidenz: 0.85,
        },
        trackers.map((t) => t.rel),
        lineOf(trackers[0].text, m.index),
      ),
    );
  }

  return { findings, examined: sources.length > 0, personalToAi };
}
