import pg from "pg";
import { purgeExpired } from "../lib/purge.ts";

// Run daily (cron or systemd timer) with DATABASE_WORKER_URL and STORAGE_DIR set.
const url = process.env.DATABASE_WORKER_URL;
if (!url) throw new Error("DATABASE_WORKER_URL missing");
const pool = new pg.Pool({ connectionString: url });
try {
  console.log("deleted cases:", await purgeExpired(pool));
} finally {
  await pool.end();
}
