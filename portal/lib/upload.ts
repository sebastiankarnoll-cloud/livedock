import { createWriteStream, mkdirSync, renameSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform, type Readable } from "node:stream";
import type pg from "pg";
import { withUser } from "./db.ts";
import { unzipSafely, ArchiveError } from "./unzip.ts";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export class UploadError extends Error {
  code: "too_large" | "not_zip" | "unsafe" | "too_big_unpacked" | "empty" | "no_case";
  constructor(code: UploadError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export const storageRoot = () => resolve(process.env.STORAGE_DIR ?? "./storage");

/** Every case has its own folder. Nothing is shared between cases (hard rule 6). */
export const caseDir = (caseId: string, root = storageRoot()) => {
  if (!/^[0-9a-f-]{36}$/.test(caseId)) throw new Error("bad case id");
  return join(root, caseId);
};

/**
 * Stores an uploaded zip for the user's case: size limit while streaming,
 * safe unpacking, one project per case (a new upload replaces the old one).
 * The code is never executed.
 */
export async function saveProject(
  pool: pg.Pool,
  input: { userId: string; caseId: string; filename: string; body: Readable; root?: string; maxBytes?: number },
): Promise<{ files: number; bytes: number }> {
  const root = input.root ?? storageRoot();
  const max = input.maxBytes ?? MAX_UPLOAD_BYTES;

  // The case must belong to this user (row level security answers for us).
  const own = await withUser(pool, input.userId, (c) => c.query("select id from cases where id = $1", [input.caseId]));
  if (!own.rowCount) throw new UploadError("no_case", "case not found");

  const dir = caseDir(input.caseId, root);
  const tmpZip = join(dir, "upload.zip.part");
  const codeDir = join(dir, "code");
  const newCode = join(dir, "code.new");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  rmSync(newCode, { recursive: true, force: true });

  let size = 0;
  const limiter = new Transform({
    transform(chunk, _e, cb) {
      size += chunk.length;
      if (size > max) return cb(new UploadError("too_large", "file too large"));
      cb(null, chunk);
    },
  });
  try {
    await pipeline(input.body, limiter, createWriteStream(tmpZip, { mode: 0o600 }));
    let res;
    try {
      res = await unzipSafely(tmpZip, newCode);
    } catch (e) {
      if (e instanceof ArchiveError) {
        throw new UploadError(e.code === "not_zip" ? "not_zip" : e.code === "too_big" || e.code === "too_many_files" ? "too_big_unpacked" : "unsafe", e.message);
      }
      throw e;
    }
    if (res.files === 0) throw new UploadError("empty", "no files");
    rmSync(codeDir, { recursive: true, force: true });
    renameSync(newCode, codeDir);
    await withUser(pool, input.userId, async (c) => {
      await c.query("delete from projects where case_id = $1", [input.caseId]);
      await c.query(
        "insert into projects(case_id, user_id, original_name, zip_bytes, file_count, byte_count) values ($1,$2,$3,$4,$5,$6)",
        [input.caseId, input.userId, input.filename.slice(0, 200), size, res.files, res.bytes],
      );
    });
    return res;
  } catch (e) {
    rmSync(newCode, { recursive: true, force: true });
    throw e;
  } finally {
    rmSync(tmpZip, { force: true });
  }
}

export function projectDirIfPresent(caseId: string, root = storageRoot()): string | null {
  const d = join(caseDir(caseId, root), "code");
  return existsSync(d) && statSync(d).isDirectory() ? d : null;
}
