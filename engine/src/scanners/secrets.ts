import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Finding } from "../types.ts";
import { walkFiles, readText } from "./walk.ts";

// Area 1 "Geheimnisse". Built-in detector for high-confidence patterns only
// (provider-specific key formats, credentials in connection strings, private
// keys, committed .env files). Deliberately no generic "looks random" rule:
// better 3 sure findings than 10 unsure ones (hard rule 3).
//
// Hard rule 2: the matched text is never stored, logged or returned. Only a
// masked hint is kept. A gitleaks adapter can be added later behind the same
// function signature.

interface Rule {
  id: string;
  re: RegExp;
  label: string;
  hint: (match: string) => string;
}

const maskKey = (s: string) => `${s.slice(0, 3)}…${s.slice(-4)}`;

const RULES: Rule[] = [
  {
    id: "openai-key",
    re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}\b/,
    label: "KI-Dienst-Schlüssel (OpenAI)",
    hint: maskKey,
  },
  {
    id: "anthropic-key",
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}/,
    label: "KI-Dienst-Schlüssel (Anthropic)",
    hint: maskKey,
  },
  {
    id: "aws-access-key",
    re: /\bAKIA[0-9A-Z]{16}\b/,
    label: "Cloud-Zugangsschlüssel (AWS)",
    hint: maskKey,
  },
  {
    id: "github-token",
    re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
    label: "Zugangstoken (GitHub)",
    hint: maskKey,
  },
  {
    id: "stripe-live-key",
    re: /\b[sr]k_live_[A-Za-z0-9]{20,}\b/,
    label: "Zahlungs-Schlüssel (Stripe, live)",
    hint: maskKey,
  },
  {
    id: "private-key",
    re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    label: "Privater Schlüssel",
    hint: () => "private key",
  },
  {
    id: "db-url-with-password",
    re: /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/)[^:\s/@]+:([^@\s]{4,})@\S+/,
    label: "Datenbank-Zugang mit Passwort",
    hint: (m) => `${m.split("//")[0]}//…`,
  },
];

// Values that are clearly placeholders, not credentials (exact match only).
const PLACEHOLDERS = new Set(["password", "changeme", "xxx", "xxxx", "your_password", "yourpassword", "secret", "example"]);

function isPlaceholderPassword(pw: string): boolean {
  const p = pw.toLowerCase();
  return PLACEHOLDERS.has(p) || /^[<{$].*[>}]?$/.test(p) || /^\*+$/.test(p);
}

const isEnvFile = (name: string) => name === ".env" || (name.startsWith(".env.") && !/\.(example|sample|template|dist)$/.test(name));
const isTemplateFile = (name: string) => /\.(example|sample|template|dist)$/.test(name);

function envIgnoredByGitignore(root: string): boolean {
  const p = join(root, ".gitignore");
  if (!existsSync(p)) return false;
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .some((l) => l === ".env" || l === ".env*" || l === ".env.*" || l === "*.env" || l === "/.env");
}

function hasRealEnvValue(text: string): boolean {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (value && !isPlaceholderPassword(value)) return true;
  }
  return false;
}

export function scanSecrets(root: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const envIgnored = envIgnoredByGitignore(root);
  let n = 0;

  for (const file of walkFiles(root)) {
    const text = readText(file);
    if (text === null) continue;

    // (a) committed .env files with real values (customer repo does not ignore them)
    if (isEnvFile(file.name) && !envIgnored && hasRealEnvValue(text)) {
      findings.push({
        id: `env-${++n}`,
        area: "geheimnisse",
        severity: "hoch",
        kategorie: "Konfigurationsdatei mit Zugangsdaten im Projekt",
        auswirkung: "Zugangsdaten liegen im Projektordner und gelangen mit dem Code an jeden, der ihn sieht.",
        bereich: "Konfiguration",
        konfidenz: 0.95,
        acute: false,
        intern: { datei: file.rel, zeile: 1, regel: "env-file" },
      });
    }

    // (b) provider-specific keys, credentials in connection strings, private keys
    if (isTemplateFile(file.name)) continue; // templates carry placeholders by design
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      for (const rule of RULES) {
        const m = rule.re.exec(lines[i]);
        if (!m) continue;
        if (rule.id === "db-url-with-password" && isPlaceholderPassword(m[2])) continue;
        const key = `${rule.id}:${file.rel}:${i + 1}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          id: `secret-${++n}`,
          area: "geheimnisse",
          severity: "hoch",
          kategorie: rule.label + " im Code",
          auswirkung: "Jeder mit Zugriff auf den Code kann den Dienst auf deine Kosten und mit deinen Daten nutzen. Der Schlüssel muss sofort erneuert werden.",
          bereich: "Code",
          konfidenz: 0.95,
          acute: true,
          hinweis: rule.hint(m[0]),
          intern: { datei: file.rel, zeile: i + 1, regel: rule.id },
        });
      }
    }
  }
  return findings;
}
