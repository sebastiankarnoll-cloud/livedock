import pg from "pg";
import { drainQueue } from "../lib/worker.ts";

// Long-running worker: looks for queued checks every 2 seconds. Needs DATABASE_WORKER_URL and STORAGE_DIR.
const url = process.env.DATABASE_WORKER_URL;
if (!url) throw new Error("DATABASE_WORKER_URL missing");
const pool = new pg.Pool({ connectionString: url, max: 3 });
console.log("worker started");
for (;;) {
  try {
    const n = await drainQueue(pool);
    if (n) console.log("checks done:", n);
  } catch {
    console.error("worker loop failed");
  }
  await new Promise((r) => setTimeout(r, 2000));
}
