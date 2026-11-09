import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import yauzl from "yauzl";

// Hard rule 1: uploaded code is only unpacked and read, never executed.
// This module is defensive against hostile archives: path tricks (zip slip),
// links, huge or endless content (zip bomb) and too many files.

export interface UnzipLimits {
  maxEntries: number;
  maxTotalBytes: number;
  maxEntryBytes: number;
}

export const DEFAULT_LIMITS: UnzipLimits = {
  maxEntries: 20_000,
  maxTotalBytes: 300 * 1024 * 1024,
  maxEntryBytes: 50 * 1024 * 1024,
};

export class ArchiveError extends Error {
  code: "not_zip" | "unsafe_path" | "link" | "too_many_files" | "too_big" | "encrypted";
  constructor(code: ArchiveError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

// Folders we do not need and do not keep (the engine skips them too).
const SKIP = new Set(["node_modules", ".git", ".next", ".venv", "__pycache__"]);

function cleanName(name: string): string | null {
  if (name.includes("\\") || name.includes("\0") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) {
    throw new ArchiveError("unsafe_path", "unsafe path");
  }
  const parts = name.split("/").filter((p) => p !== "" && p !== ".");
  if (parts.includes("..")) throw new ArchiveError("unsafe_path", "unsafe path");
  if (parts.some((p) => SKIP.has(p))) return null;
  return parts.join("/");
}

export function unzipSafely(zipPath: string, dest: string, limits: UnzipLimits = DEFAULT_LIMITS): Promise<{ files: number; bytes: number }> {
  const root = resolve(dest);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  return new Promise((resolveP, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true, decodeStrings: true, strictFileNames: true }, (err, zip) => {
      if (err || !zip) return reject(new ArchiveError("not_zip", "not a zip file"));
      if (zip.entryCount > limits.maxEntries) {
        zip.close();
        return reject(new ArchiveError("too_many_files", "too many files"));
      }
      let files = 0;
      let total = 0;
      const fail = (e: unknown) => {
        zip.close();
        if (e instanceof ArchiveError) return reject(e);
        const msg = e instanceof Error ? e.message : "";
        // yauzl already refuses some path tricks itself; report them the same way.
        if (/invalid relative path|absolute path|invalid characters in fileName/i.test(msg)) return reject(new ArchiveError("unsafe_path", "unsafe path"));
        if (/signature|central directory|compressed|uncompressed|invalid|unsupported|too short|end of/i.test(msg)) return reject(new ArchiveError("not_zip", "damaged archive"));
        reject(e);
      };
      zip.on("error", fail);
      zip.on("end", () => resolveP({ files, bytes: total }));
      zip.on("entry", async (entry: yauzl.Entry) => {
        try {
          const isDir = entry.fileName.endsWith("/");
          const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
          const fileType = mode & 0o170000;
          if (fileType === 0o120000) throw new ArchiveError("link", "links are not allowed");
          if (fileType !== 0 && fileType !== 0o100000 && fileType !== 0o040000) throw new ArchiveError("link", "special file");
          if (entry.isEncrypted()) throw new ArchiveError("encrypted", "encrypted archive");
          const rel = cleanName(entry.fileName);
          if (rel === null || rel === "") return zip.readEntry();
          const target = join(root, rel);
          if (target !== root && !target.startsWith(root + sep)) throw new ArchiveError("unsafe_path", "unsafe path");
          if (isDir) {
            mkdirSync(target, { recursive: true, mode: 0o700 });
            return zip.readEntry();
          }
          if (entry.uncompressedSize > limits.maxEntryBytes) throw new ArchiveError("too_big", "file too big");
          mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
          const rs: NodeJS.ReadableStream = await new Promise((res, rej) => zip.openReadStream(entry, (e, s) => (e || !s ? rej(e) : res(s))));
          // Count the real bytes while unpacking: the sizes in the header cannot be trusted.
          let entryBytes = 0;
          const counter = new Transform({
            transform(chunk, _enc, cb) {
              entryBytes += chunk.length;
              total += chunk.length;
              if (entryBytes > limits.maxEntryBytes || total > limits.maxTotalBytes) return cb(new ArchiveError("too_big", "too big"));
              cb(null, chunk);
            },
          });
          await pipeline(rs, counter, createWriteStream(target, { mode: 0o600, flags: "wx" }));
          files++;
          zip.readEntry();
        } catch (e) {
          fail(e);
        }
      });
      zip.readEntry();
    });
  });
}
