import pg from "pg";

// One pool per process. The app role has no superuser and no BYPASSRLS,
// so row level security always applies (hard rule 6).
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL missing");
    pool = new pg.Pool({ connectionString: url, max: 10 });
  }
  return pool;
}

/** Control center pool (role livedock_staff). Missing URL = control center switched off. */
let staffPool: pg.Pool | null = null;
export function getStaffPool(): pg.Pool {
  if (!staffPool) {
    const url = process.env.DATABASE_STAFF_URL;
    if (!url) throw new Error("DATABASE_STAFF_URL missing");
    staffPool = new pg.Pool({ connectionString: url, max: 3 });
  }
  return staffPool;
}

export function makePool(url: string): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 5 });
}

/**
 * Runs fn in a transaction that is bound to one user. Every query inside can
 * only see that user's rows; there is no way to ask for another user's data.
 */
export async function withUser<T>(pool: pg.Pool, userId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('app.user_id', $1, true)", [userId]);
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
