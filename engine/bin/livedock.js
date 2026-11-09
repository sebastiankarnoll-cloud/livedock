#!/usr/bin/env node
// Thin launcher: runs the TypeScript CLI via Node's built-in type stripping.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(r.status ?? 1);
