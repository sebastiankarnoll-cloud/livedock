import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

// Applies migrations/*.sql in order, once each. Uses the owner role.
export async function migrate(adminUrl: string, dir = join(import.meta.dirname, "../migrations")) {
  const c = new pg.Client({ connectionString: adminUrl });
  await c.connect();
  try {
    await c.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const done = new Set((await c.query("select name from schema_migrations")).rows.map((r) => r.name));
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
      if (done.has(f)) continue;
      await c.query("begin");
      try {
        await c.query(readFileSync(join(dir, f), "utf8"));
        await c.query("insert into schema_migrations(name) values ($1)", [f]);
        await c.query("commit");
        console.log("migrated", f);
      } catch (e) {
        await c.query("rollback");
        throw e;
      }
    }
  } finally {
    await c.end();
  }
}

if (process.argv[1] === import.meta.filename) {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL missing");
  await migrate(url);
}
