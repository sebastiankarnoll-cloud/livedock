import { readdirSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import type pg from "pg";
import { ENGINE_VERSION } from "../../engine/src/check.ts";
import type { CheckResult } from "../../engine/src/types.ts";
import { projectDirIfPresent, storageRoot } from "./upload.ts";

// The worker runs with the worker role (sees all cases) and only READS the customer code (hard rule 1):
// the engine lists files and matches patterns, it never starts anything from the project.

/** Zips often contain one top-level folder; the project starts inside it. */
export function projectRoot(codeDir: string): string {
  let dir = codeDir;
  for (let i = 0; i < 2; i++) {
    const entries = readdirSync(dir);
    if (entries.length === 1 && statSync(join(dir, entries[0])).isDirectory()) dir = join(dir, entries[0]);
    else break;
  }
  return dir;
}

const CHECK_TIMEOUT_MS = 10 * 60 * 1000;
const RUN_CHECK = resolve(import.meta.dirname, "../scripts/run-check.ts");

/**
 * Runs the engine in a separate process: a crash or an endless loop on strange customer code cannot
 * take the worker down, and the process has no database password in its environment (hard rules 1 and 6).
 */
export function runEngine(dir: string, onStep: (id: string) => Promise<void>): Promise<CheckResult> {
  return new Promise((resolveP, reject) => {
    const child = spawn(process.execPath, ["--max-old-space-size=768", RUN_CHECK, dir], {
      env: { NODE_ENV: "production", PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LIVEDOCK_AUDIT: process.env.LIVEDOCK_AUDIT ?? "" },
      stdio: ["ignore", "pipe", "ignore"] as ["ignore", "pipe", "ignore"],
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), CHECK_TIMEOUT_MS);
    let chain: Promise<void> = Promise.resolve();
    let result: CheckResult | null = null;
    createInterface({ input: child.stdout }).on("line", (line) => {
      try {
        const m = JSON.parse(line);
        if (m.step) chain = chain.then(() => onStep(m.step));
        else if (m.result) result = m.result;
      } catch {
        /* ignore stray output */
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      chain.then(() => (code === 0 && result ? resolveP(result) : reject(new Error("engine failed"))), reject);
    });
  });
}

export interface Job {
  id: string;
  case_id: string;
  user_id: string;
}

export async function claimNext(worker: pg.Pool): Promise<Job | null> {
  const r = await worker.query(
    `update jobs set status = 'running', started_at = now()
     where id = (select id from jobs where status = 'queued' order by created_at for update skip locked limit 1)
     returning id, case_id, user_id`,
  );
  return r.rowCount ? (r.rows[0] as Job) : null;
}

export async function runJob(worker: pg.Pool, job: Job, root = storageRoot()): Promise<void> {
  try {
    const dir = projectDirIfPresent(job.case_id, root);
    if (!dir) throw new Error("no project");
    const result = await runEngine(projectRoot(dir), async (id) => {
      await worker.query("update jobs set steps_done = array_append(steps_done, $2) where id = $1", [job.id, id]);
    });
    await worker.query(
      "insert into check_results_internal(job_id, case_id, user_id, engine_version, result_code, result_json) values ($1,$2,$3,$4,$5,$6)",
      [job.id, job.case_id, job.user_id, ENGINE_VERSION, result.result, JSON.stringify(result)],
    );
    await worker.query("update jobs set status = 'done', finished_at = now() where id = $1", [job.id]);
  } catch {
    // No details in the database or log: they could contain customer content.
    await worker.query("update jobs set status = 'failed', error = 'check failed', finished_at = now() where id = $1", [job.id]);
  }
}

/** Processes queued jobs until none is left; returns how many ran. */
export async function drainQueue(worker: pg.Pool, root = storageRoot()): Promise<number> {
  let n = 0;
  for (;;) {
    const job = await claimNext(worker);
    if (!job) return n;
    await runJob(worker, job, root);
    n++;
  }
}
