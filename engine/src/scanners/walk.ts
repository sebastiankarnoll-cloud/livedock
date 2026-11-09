import { readdirSync, readFileSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join, relative } from "node:path";

// Shared, read-only file walker. Never follows symlinks, never executes anything.

export const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".venv", "__pycache__"]);
const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"]);
const MAX_BYTES = 1_000_000;

export interface SourceFile {
  /** path relative to the project root, internal use only */
  rel: string;
  abs: string;
  name: string;
}

export function* walkFiles(root: string): Generator<SourceFile> {
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of readdirSync(cur, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue;
      const abs = join(cur, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(abs);
      } else if (e.isFile() && !SKIP_FILES.has(e.name)) {
        yield { rel: relative(root, abs), abs, name: e.name };
      }
    }
  }
}

/** Returns file text, or null for oversized or binary files. */
export function readText(file: SourceFile): string | null {
  const size = statSync(file.abs).size;
  if (size === 0 || size > MAX_BYTES) return null;
  const fd = openSync(file.abs, "r");
  try {
    const head = Buffer.alloc(Math.min(4096, size));
    readSync(fd, head, 0, head.length, 0);
    if (head.includes(0)) return null; // binary
  } finally {
    closeSync(fd);
  }
  return readFileSync(file.abs, "utf8");
}
