import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { StackInfo } from "./types.ts";

// Hard rule 1: customer code is only read, never executed.
// This module only lists file names and parses package.json as data.

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".venv", "__pycache__"]);
const MAX_FILES = 10_000;

const FOREIGN_MARKERS: Array<[string, string]> = [
  ["manage.py", "python"],
  ["requirements.txt", "python"],
  ["pyproject.toml", "python"],
  ["Gemfile", "ruby"],
  ["composer.json", "php"],
  ["go.mod", "go"],
  ["pom.xml", "java"],
  ["build.gradle", "java"],
  ["Cargo.toml", "rust"],
];

const AI_PACKAGES: Record<string, string> = {
  openai: "openai",
  "@anthropic-ai/sdk": "anthropic",
  "@mistralai/mistralai": "mistral",
  "@google/generative-ai": "google",
  "@google/genai": "google",
  ai: "vercel-ai-sdk",
  "@ai-sdk/openai": "openai",
  "@ai-sdk/anthropic": "anthropic",
  "@ai-sdk/mistral": "mistral",
  "@ai-sdk/google": "google",
};

const VALIDATION_PACKAGES = ["zod", "yup", "joi", "valibot", "ajv"];

/** Counts files (names only), skipping vendor dirs. Stops early above MAX_FILES. */
function countFiles(dir: string): { count: number; tooBig: boolean; names: Set<string> } {
  const names = new Set<string>();
  let count = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of readdirSync(cur, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue; // never follow links out of the repo
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(join(cur, e.name));
      } else if (e.isFile()) {
        count++;
        if (cur === dir) names.add(e.name);
        if (count > MAX_FILES) return { count, tooBig: true, names };
      }
    }
  }
  return { count, tooBig: false, names };
}

function readPackageJson(dir: string): Record<string, unknown> | null {
  const p = join(dir, "package.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null; // unreadable package.json is treated as "no package.json"
  }
}

export function detectStack(dir: string): StackInfo {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return emptyInfo("leer", "unbekannt", 0);
  }

  const { count, tooBig, names } = countFiles(dir);
  if (count === 0) return emptyInfo("leer", "unbekannt", 0);
  if (tooBig) return emptyInfo("zu_gross", "unbekannt", count);

  const pkg = readPackageJson(dir);
  if (pkg) {
    const deps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    };
    const has = (name: string) => name in deps;
    const ai = [...new Set(Object.keys(deps).filter((d) => d in AI_PACKAGES).map((d) => AI_PACKAGES[d]))].sort();
    return {
      status: "unterstuetzt",
      kind: has("next") ? "nextjs" : "node",
      features: {
        supabase: Object.keys(deps).some((d) => d.startsWith("@supabase/")),
        ai,
        validation: VALIDATION_PACKAGES.some(has),
      },
      fileCount: count,
    };
  }

  for (const [marker, kind] of FOREIGN_MARKERS) {
    if (names.has(marker)) return emptyInfo("nicht_unterstuetzt", kind, count);
  }
  return emptyInfo("nicht_unterstuetzt", "unbekannt", count);
}

function emptyInfo(status: StackInfo["status"], kind: string, fileCount: number): StackInfo {
  return { status, kind, features: { supabase: false, ai: [], validation: false }, fileCount };
}
