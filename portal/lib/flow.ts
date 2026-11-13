import type pg from "pg";
import { withUser } from "./db.ts";
import { ensureCase } from "./cases.ts";

export type Stage = "verbinden" | "fragen" | "laeuft" | "wartet" | "ergebnis";

export const STAGE_PATH: Record<Stage, string> = {
  verbinden: "/verbinden",
  fragen: "/fragen",
  laeuft: "/laeuft",
  wartet: "/wartet",
  ergebnis: "/ergebnis",
};

/** Where the customer is on the way, derived from what exists. Each screen sends people to their own stage. */
export async function stageOf(pool: pg.Pool, userId: string): Promise<{ stage: Stage; caseId: string; deleteAfter: Date; failed: boolean }> {
  const c = await ensureCase(pool, userId);
  const r = await withUser(pool, userId, async (q) => {
    const p = await q.query("select 1 from projects limit 1");
    const j = await q.query("select status from jobs limit 1");
    const o = await q.query("select 1 from check_results_public limit 1");
    return { project: p.rowCount! > 0, job: (j.rows[0]?.status ?? null) as string | null, released: o.rowCount! > 0 };
  });
  let stage: Stage = "verbinden";
  if (r.released) stage = "ergebnis";
  else if (r.job === "queued" || r.job === "running") stage = "laeuft";
  else if (r.job === "done" || r.job === "failed") stage = "wartet";
  else if (r.project) stage = "fragen";
  return { stage, caseId: c.id, deleteAfter: new Date(c.delete_after), failed: r.job === "failed" };
}

export const STEP_LABELS: Record<string, string> = {
  stack: "Projekt gelesen",
  geheimnisse: "Geheimnisse",
  zugang_rechte: "Zugang und Rechte",
  daten_datenschutz: "Daten und Datenschutz",
  ki_anbindung: "KI-Anbindung",
  code_bausteine: "Code und Bausteine",
};
export const STEP_ORDER = Object.keys(STEP_LABELS);

export interface Answers {
  purpose: string;
  audience: string;
  task: string;
  target: string;
}

const clip = (v: unknown, n = 300) => String(v ?? "").trim().slice(0, n);

/** Saves the answers (or the skip) and queues the check. Only one check per case; a second call does nothing. */
export async function startCheck(pool: pg.Pool, userId: string, input: Partial<Answers> | "skip"): Promise<boolean> {
  const c = await ensureCase(pool, userId);
  return withUser(pool, userId, async (q) => {
    const proj = await q.query("select 1 from projects where case_id = $1", [c.id]);
    if (!proj.rowCount) return false;
    const a = input === "skip" ? null : input;
    await q.query(
      `insert into case_answers(case_id, user_id, skipped, purpose, audience, task, target)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (case_id) do nothing`,
      [c.id, userId, a === null, clip(a?.purpose), clip(a?.audience, 60), clip(a?.task), clip(a?.target, 60)],
    );
    const j = await q.query("insert into jobs(case_id, user_id) values ($1,$2) on conflict (case_id) do nothing returning id", [c.id, userId]);
    return j.rowCount === 1;
  });
}
