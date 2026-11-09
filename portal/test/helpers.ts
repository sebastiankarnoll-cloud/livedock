import { makePool } from "../lib/db.ts";
import pg from "pg";

export const APP_URL = "postgres://livedock_app:app@localhost:5432/livedock_test";
export const ADMIN_URL = "postgres://livedock_owner:owner@localhost:5432/livedock_test";

export function pools(): { app: pg.Pool; admin: pg.Pool } {
  return { app: makePool(APP_URL), admin: makePool(ADMIN_URL) };
}

export async function reset(admin: pg.Pool) {
  await admin.query("truncate users, outbox cascade");
}

/** Pulls the login token out of the newest mail in the outbox. */
export async function lastToken(admin: pg.Pool, email: string): Promise<string> {
  const r = await admin.query("select body from outbox where to_email = $1 order by created_at desc limit 1", [email]);
  const m = /t=([A-Za-z0-9_-]+)/.exec(r.rows[0].body);
  if (!m) throw new Error("no token in mail");
  return m[1];
}
