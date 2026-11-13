import pg from "pg";
import { drainQueue } from "../lib/worker.ts";
import { sendPendingAlerts } from "../lib/alerts.ts";
import { getMailer } from "../lib/mail.ts";
import { alertAddress } from "../lib/staff.ts";

// Long-running worker: looks for queued checks every 2 seconds. Needs DATABASE_WORKER_URL and STORAGE_DIR.
const url = process.env.DATABASE_WORKER_URL;
if (!url) throw new Error("DATABASE_WORKER_URL missing");
const pool = new pg.Pool({ connectionString: url, max: 3 });
const mailer = getMailer(pool);
const alertTo = alertAddress(); // fails at start if nobody would receive the immediate alert
const baseUrl = process.env.PUBLIC_URL ?? "http://localhost:3000";
console.log("worker started");
for (;;) {
  try {
    const n = await drainQueue(pool);
    if (n) console.log("checks done:", n);
  } catch {
    console.error("worker loop failed");
  }
  try {
    const a = await sendPendingAlerts(pool, mailer, { to: alertTo, baseUrl });
    if (a) console.log("alerts sent:", a);
  } catch {
    console.error("alerts failed");
  }
  await new Promise((r) => setTimeout(r, 2000));
}
