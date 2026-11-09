import type { Finding } from "../types.ts";
import type { Src } from "./load.ts";
import { lineOf } from "./load.ts";
import type { AiFile, AiRoute } from "./aiusage.ts";

// Area 4: AI connection. Conservative rules only (hard rule 3).
//   input-in-prompt      request text goes unchecked into the prompt
//   no-rate-limit        route leads to an AI call and has no per-user limit anywhere in its path
//   outside-eu           provider outside the EU, no region hint (only if not already reported in area 3)
//   public-ai-key        AI key exposed to the browser via NEXT_PUBLIC_

const VALID = /safeParse\(|\bz\.\w+\(|(?:schema|Schema)\.parse\(|validate\(/;
const RATE = /rate[-_ ]?limit|ratelimit|upstash|limiter|throttle|too many requests|status:\s*429|\ballow\(/i;
const PUBLIC_AI_KEY = /NEXT_PUBLIC_[A-Z0-9_]*(?:OPENAI|ANTHROPIC|MISTRAL|GEMINI|GOOGLE_AI)[A-Z0-9_]*/;

export interface AiScan {
  findings: Finding[];
  /** "ja": AI usage found and looked at; "keine": none in the project; "offen": libraries present but no recognizable call */
  status: "geprueft" | "keine" | "offen";
  rateLimited: boolean;
}

function make(rule: string, f: Omit<Finding, "id" | "area" | "acute" | "intern">, files: string[], zeile: number): Finding {
  const uniq = [...new Set(files)];
  return {
    id: `ki-${rule}`,
    area: "ki_anbindung",
    acute: false,
    ...f,
    intern: { datei: uniq.slice(0, 5).join(", ") + (uniq.length > 5 ? ` (+${uniq.length - 5})` : ""), zeile, regel: rule },
  };
}

function requestNames(text: string): string[] {
  const names: string[] = [];
  const destr = /const\s*\{([^}]*)\}\s*=\s*await\s+(?:req|request)\.json\(\)/.exec(text);
  if (destr) {
    for (const part of destr[1].split(",")) {
      const n = part.split(":").pop()!.split("=")[0].trim();
      if (/^\w+$/.test(n)) names.push(n);
    }
  }
  const whole = /const\s+(\w+)\s*=\s*await\s+(?:req|request)\.json\(\)/.exec(text);
  if (whole) names.push(whole[1]);
  return names;
}

export function scanAi(
  sources: Src[],
  aiFiles: AiFile[],
  aiRoutes: AiRoute[],
  personalToAi: Set<string>,
  declaredAiLibs: number,
): AiScan {
  const findings: Finding[] = [];

  // input-in-prompt
  const injection: { rel: string; line: number }[] = [];
  for (const a of aiFiles) {
    if (VALID.test(a.text)) continue;
    for (const n of requestNames(a.text)) {
      const interp = new RegExp(`\\$\\{[^}]*\\b${n}\\b|content\\s*:\\s*${n}\\b`).exec(a.text);
      if (interp) {
        injection.push({ rel: a.rel, line: lineOf(a.text, interp.index) });
        break;
      }
    }
  }
  if (injection.length) {
    findings.push(
      make(
        "input-in-prompt",
        {
          severity: "mittel",
          kategorie: "Nutzereingabe ungefiltert im KI-Auftrag",
          auswirkung: "Nutzer können die KI umlenken (Prompt-Injection) oder an Angaben kommen, die im Auftrag mitgeschickt werden.",
          bereich: "KI-Anbindung",
          konfidenz: 0.85,
        },
        injection.map((i) => i.rel),
        injection[0].line,
      ),
    );
  }

  // no-rate-limit
  const middleware = sources.filter((s) => /^(src\/)?middleware\.(ts|js)$/.test(s.rel.split("\\").join("/")));
  const unlimited: AiRoute[] = [];
  let anyLimited = false;
  for (const r of aiRoutes) {
    const limited = RATE.test(r.route.text) || r.via.some((v) => RATE.test(v.text)) || middleware.some((m) => RATE.test(m.text));
    if (limited) anyLimited = true;
    else unlimited.push(r);
  }
  if (unlimited.length) {
    findings.push(
      make(
        "no-rate-limit",
        {
          severity: "mittel",
          kategorie: "Kein Limit für KI-Aufrufe pro Nutzer",
          auswirkung: "Einzelne Nutzer oder Angreifer können hohe KI-Kosten verursachen.",
          bereich: "KI-Anbindung",
          konfidenz: 0.85,
        },
        unlimited.map((u) => u.route.rel),
        1,
      ),
    );
  }

  // outside-eu (not twice: area 3 already reports AI files that receive personal data)
  const outside = aiFiles.filter((a) => a.outsideEu && !personalToAi.has(a.rel));
  if (outside.length) {
    findings.push(
      make(
        "outside-eu",
        {
          severity: "niedrig",
          kategorie: "KI-Dienst standardmäßig außerhalb der EU",
          auswirkung: "Eingaben gehen an einen Anbieter außerhalb der EU. Es braucht einen Vertrag und einen Hinweis in der Datenschutzerklärung, oder einen EU-Anbieter.",
          bereich: "KI-Anbindung",
          konfidenz: 0.85,
        },
        outside.map((o) => o.rel),
        1,
      ),
    );
  }

  // public-ai-key
  const pub: { rel: string; line: number }[] = [];
  for (const s of sources) {
    const m = PUBLIC_AI_KEY.exec(s.text);
    if (m) pub.push({ rel: s.rel, line: lineOf(s.text, m.index) });
  }
  if (pub.length) {
    findings.push(
      make(
        "public-ai-key",
        {
          severity: "hoch",
          kategorie: "KI-Schlüssel für den Browser freigegeben",
          auswirkung: "Jeder Besucher kann den Schlüssel auslesen und auf Ihre Kosten nutzen.",
          bereich: "KI-Anbindung",
          konfidenz: 0.9,
        },
        pub.map((p) => p.rel),
        pub[0].line,
      ),
    );
  }

  const status: AiScan["status"] = aiFiles.length || pub.length ? "geprueft" : declaredAiLibs > 0 ? "offen" : "keine";
  return { findings, status, rateLimited: aiRoutes.length > 0 && unlimited.length === 0 && anyLimited };
}
