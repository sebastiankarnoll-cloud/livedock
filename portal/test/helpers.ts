import { makePool } from "../lib/db.ts";
import pg from "pg";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} missing (run npm run db:setup)`);
  return v;
};
export const APP_URL = need("TEST_DATABASE_URL");
export const ADMIN_URL = need("TEST_DATABASE_ADMIN_URL");
export const WORKER_URL = need("TEST_DATABASE_WORKER_URL");

export function pools(): { app: pg.Pool; admin: pg.Pool } {
  return { app: makePool(APP_URL), admin: makePool(ADMIN_URL) };
}

export async function reset(admin: pg.Pool) {
  await admin.query("truncate users, outbox, deletion_log cascade");
}

/** Pulls the login token out of the newest mail in the outbox. */
export async function lastToken(admin: pg.Pool, email: string): Promise<string> {
  const r = await admin.query("select body from outbox where to_email = $1 order by created_at desc limit 1", [email]);
  const m = /t=([A-Za-z0-9_-]+)/.exec(r.rows[0].body);
  if (!m) throw new Error("no token in mail");
  return m[1];
}
