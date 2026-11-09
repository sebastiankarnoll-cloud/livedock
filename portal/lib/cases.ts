import type pg from "pg";
import { withUser } from "./db.ts";

/** Every customer has exactly one open case for now. All access runs bound to the user. */
export async function ensureCase(pool: pg.Pool, userId: string): Promise<{ id: string; delete_after: Date }> {
  return withUser(pool, userId, async (c) => {
    const found = await c.query("select id, delete_after from cases order by created_at limit 1");
    if (found.rowCount) return found.rows[0];
    const made = await c.query("insert into cases(user_id) values ($1) returning id, delete_after", [userId]);
    return made.rows[0];
  });
}

export async function listCases(pool: pg.Pool, userId: string) {
  return withUser(pool, userId, async (c) => (await c.query("select id, user_id, delete_after from cases")).rows);
}
