import { Readable } from "node:stream";
import { cookies } from "next/headers";
import { getPool } from "../../../lib/db.ts";
import { getSessionUser } from "../../../lib/auth.ts";
import { COOKIE } from "../../../lib/session.ts";
import { ensureCase } from "../../../lib/cases.ts";
import { saveProject, UploadError, MAX_UPLOAD_BYTES } from "../../../lib/upload.ts";

export const dynamic = "force-dynamic";

const MESSAGES: Record<UploadError["code"], string> = {
  too_large: "Die Datei ist zu groß (höchstens 50 MB). Bitte lass node_modules weg.",
  not_zip: "Das ist keine ZIP-Datei.",
  unsafe: "Diese ZIP-Datei enthält Pfade oder Verknüpfungen, die wir nicht annehmen.",
  too_big_unpacked: "Das Projekt ist entpackt zu groß. Bitte ohne node_modules und große Dateien hochladen.",
  empty: "In der ZIP-Datei haben wir keine Projektdateien gefunden.",
  no_case: "Dein Fall wurde nicht gefunden. Bitte melde Dich neu an.",
};

const json = (status: number, body: object) => Response.json(body, { status });

export async function PUT(req: Request) {
  // Same-site only: the browser sends Origin on this kind of request; compare it with our own address.
  const origin = req.headers.get("origin");
  const own = new URL(process.env.PUBLIC_URL ?? "http://localhost:3000").origin;
  if (origin && origin !== own) return json(403, { fehler: "Nicht erlaubt." });
  if (req.headers.get("x-livedock") !== "1") return json(403, { fehler: "Nicht erlaubt." });

  const pool = getPool();
  const jar = await cookies();
  const user = await getSessionUser(pool, jar.get(COOKIE)?.value);
  if (!user) return json(401, { fehler: "Bitte melde Dich an." });

  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_UPLOAD_BYTES) return json(413, { fehler: MESSAGES.too_large });
  if (!req.body) return json(400, { fehler: MESSAGES.not_zip });

  const c = await ensureCase(pool, user.id);
  const filename = decodeURIComponent(req.headers.get("x-filename") ?? "projekt.zip");
  try {
    const r = await saveProject(pool, {
      userId: user.id,
      caseId: c.id,
      filename,
      body: Readable.fromWeb(req.body as never),
    });
    return json(200, { ok: true, dateien: r.files });
  } catch (e) {
    if (e instanceof UploadError) return json(e.code === "too_large" ? 413 : 400, { fehler: MESSAGES[e.code] });
    console.error("upload failed"); // no details, never log customer content
    return json(500, { fehler: "Das hat leider nicht geklappt. Bitte versuche es noch einmal." });
  }
}
