import { walkFiles, readText } from "./walk.ts";

export interface Src {
  rel: string;
  text: string;
}

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

/** Reads all source and SQL files once (read-only). */
export function loadSources(root: string): { sources: Src[]; sql: Src[] } {
  const sources: Src[] = [];
  const sql: Src[] = [];
  for (const f of walkFiles(root)) {
    const isSrc = SRC_EXT.test(f.name);
    const isSql = f.name.endsWith(".sql");
    if (!isSrc && !isSql) continue;
    const text = readText(f);
    if (text === null) continue;
    (isSql ? sql : sources).push({ rel: f.rel, text });
  }
  return { sources, sql };
}

export function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}
