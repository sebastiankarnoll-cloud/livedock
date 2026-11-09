import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type pg from "pg";
import { caseDir, storageRoot } from "./upload.ts";

/**
 * Deletes the code copy of every case past its deadline (30 days) and writes a log entry.
 * Runs with the worker role, the only one that sees all cases. Safe to run repeatedly.
 */
export async function purgeExpired(worker: pg.Pool, root = storageRoot()): Promise<number> {
  const due = await worker.query(
    `select c.id, c.user_id, p.file_count, p.byte_count
     from cases c left join projects p on p.case_id = c.id
     where c.delete_after < now() and c.code_deleted_at is null`,
  );
  for (const row of due.rows) {
    const dir = caseDir(row.id, root);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    if (existsSync(join(dir, "code"))) throw new Error("deletion failed"); // never log what did not happen
    await worker.query("delete from projects where case_id = $1", [row.id]);
    await worker.query("update cases set code_deleted_at = now() where id = $1", [row.id]);
    await worker.query("insert into deletion_log(case_id, user_id, what, files, bytes) values ($1,$2,'code copy',$3,$4)", [
      row.id,
      row.user_id,
      row.file_count ?? 0,
      row.byte_count ?? 0,
    ]);
  }
  return due.rowCount ?? 0;
}
