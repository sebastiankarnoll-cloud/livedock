import type pg from "pg";
import { customerView } from "./publicview.ts";
import type { CheckResult } from "../../engine/src/types.ts";
import type { Mailer } from "./mail.ts";
import { isResultCode } from "./results.ts";

// Control center logic (hard rules 4 and 5): only Sebastian sees evidence, nothing reaches the
// customer before he releases it. Runs with the staff role; the customer app role cannot do any of this.

/** Staff sessions are short: whoever is not freshly logged in must log in again. */
export const STAFF_SESSION_HOURS = 8;

/** Staff accounts come from a server setting, not from the database, so the customer app cannot create one. */
export function staffEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isStaff = (email: string, env: Record<string, string | undefined> = process.env) => staffEmails(env).includes(email.trim().toLowerCase());

export const sessionFresh = (sessionAt: Date, now = Date.now()) => now - sessionAt.getTime() <= STAFF_SESSION_HOURS * 3600_000;

/** Where the immediate alert goes: STAFF_ALERT_EMAIL, otherwise the first staff address. */
export function alertAddress(env: Record<string, string | undefined> = process.env): string {
  const a = env.STAFF_ALERT_EMAIL?.trim() || staffEmails(env)[0];
  if (!a) throw new Error("STAFF_ALERT_EMAIL or STAFF_EMAILS missing");
  return a;
}

export const shortId = (id: string) => id.slice(0, 6);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface QueueItem {
  jobId: string;
  caseId: string;
  status: "done" | "failed";
  resultCode: string | null;
  acute: boolean;
  held: boolean;
  released: boolean;
  finishedAt: Date | null;
}

export async function listQueue(staff: pg.Pool): Promise<{ waiting: QueueItem[]; released: QueueItem[] }> {
  const r = await staff.query(
    `select j.id as job_id, j.case_id, j.status, j.finished_at,
            i.result_code, coalesce((i.result_json->>'acute')::boolean, false) as acute,
            i.held_at is not null as held, i.released_at is not null as released
     from jobs j left join check_results_internal i on i.job_id = j.id
     where j.status in ('done','failed')
     order by (coalesce((i.result_json->>'acute')::boolean, false)) desc, j.finished_at`,
  );
  const items: QueueItem[] = r.rows.map((x) => ({
    jobId: x.job_id,
    caseId: x.case_id,
    status: x.status,
    resultCode: x.result_code,
    acute: x.acute,
    held: x.held,
    released: x.released,
    finishedAt: x.finished_at,
  }));
  return { waiting: items.filter((i) => !i.released), released: items.filter((i) => i.released).slice(-5).reverse() };
}

export interface Review {
  item: QueueItem;
  email: string;
  deleteAfter: Date;
  engineVersion: string | null;
  result: CheckResult | null;
  answers: { skipped: boolean; purpose: string | null; audience: string | null; task: string | null; target: string | null } | null;
  release: { at: Date; by: string; mailSentAt: Date | null; finalCode: string } | null;
  log: { action: string; actor: string; detail: string | null; at: Date }[];
}

export async function getReview(staff: pg.Pool, jobId: string): Promise<Review | null> {
  if (!UUID.test(jobId)) return null;
  const j = await staff.query(
    `select j.id, j.case_id, j.status, j.finished_at, u.email, c.delete_after,
            i.result_code, i.result_json, i.engine_version, i.held_at, i.released_at
     from jobs j join users u on u.id = j.user_id join cases c on c.id = j.case_id
     left join check_results_internal i on i.job_id = j.id
     where j.id = $1`,
    [jobId],
  );
  if (!j.rowCount) return null;
  const x = j.rows[0];
  const [a, p, l] = await Promise.all([
    staff.query("select skipped, purpose, audience, task, target from case_answers where case_id = $1", [x.case_id]),
    staff.query("select released_at, released_by, mail_sent_at, result_code from check_results_public where job_id = $1", [jobId]),
    staff.query("select action, actor, detail, created_at from review_log where job_id = $1 order by created_at", [jobId]),
  ]);
  const result = (x.result_json ?? null) as CheckResult | null;
  return {
    item: {
      jobId: x.id,
      caseId: x.case_id,
      status: x.status,
      resultCode: x.result_code,
      acute: !!result?.acute,
      held: !!x.held_at,
      released: !!x.released_at,
      finishedAt: x.finished_at,
    },
    email: x.email,
    deleteAfter: x.delete_after,
    engineVersion: x.engine_version,
    result,
    answers: a.rowCount ? a.rows[0] : null,
    release: p.rowCount ? { at: p.rows[0].released_at, by: p.rows[0].released_by, mailSentAt: p.rows[0].mail_sent_at, finalCode: p.rows[0].result_code } : null,
    log: l.rows.map((r) => ({ action: r.action, actor: r.actor, detail: r.detail, at: r.created_at })),
  };
}

const logAction = (q: pg.Pool | pg.PoolClient, jobId: string, action: string, actor: string, detail?: string) =>
  q.query("insert into review_log(job_id, action, actor, detail) values ($1,$2,$3,$4)", [jobId, action, actor, detail ?? null]);

export function releaseMail(baseUrl: string) {
  return {
    subject: "Dein Ergebnis ist da",
    // Only a link: no price, no findings (the customer sees both on the result page).
    body: `Hallo,\n\ndein Schnellcheck ist fertig. Dein Ergebnis wartet auf Dich:\n\n${baseUrl.replace(/\/$/, "")}/ergebnis\n\nDeine Code-Kopie wird nach 30 Tagen automatisch gelöscht.\n\nSebastian Karnoll, livedock.`,
  };
}

async function sendReleaseMail(staff: pg.Pool, mailer: Mailer, jobId: string, to: string, baseUrl: string, actor: string) {
  const m = releaseMail(baseUrl);
  try {
    await mailer.send(to, m.subject, m.body);
    await staff.query("update check_results_public set mail_sent_at = now() where job_id = $1", [jobId]);
    await logAction(staff, jobId, "mail_sent", actor);
  } catch {
    await logAction(staff, jobId, "mail_failed", actor); // no error text: it could contain the address
  }
}

/**
 * Release (hard rule 5): writes the customer view (no evidence, no review hint), marks the job released,
 * protocols who did it, then mails the link. Releasing twice does nothing. If the mail fails, the release
 * stands and the mail can be sent again.
 */
export async function releaseResult(
  staff: pg.Pool,
  mailer: Mailer,
  input: { jobId: string; actor: string; resultCode: string; baseUrl: string },
): Promise<"released" | "already" | "not_found"> {
  if (!UUID.test(input.jobId) || !isResultCode(input.resultCode)) return "not_found";
  const c = await staff.connect();
  let to = "";
  try {
    await c.query("begin");
    const r = await c.query(
      `select i.result_json, i.result_code, i.user_id, i.case_id, i.released_at, u.email
       from check_results_internal i join users u on u.id = i.user_id
       where i.job_id = $1 for update of i`,
      [input.jobId],
    );
    if (!r.rowCount) {
      await c.query("rollback");
      return "not_found";
    }
    const row = r.rows[0];
    if (row.released_at) {
      await c.query("rollback");
      return "already";
    }
    const view = customerView(row.result_json as CheckResult);
    const final = { ...view, result: input.resultCode };
    await c.query(
      `insert into check_results_public(job_id, case_id, user_id, result_code, result_json, released_by)
       values ($1,$2,$3,$4,$5,$6)`,
      [input.jobId, row.case_id, row.user_id, input.resultCode, JSON.stringify(final), input.actor],
    );
    await c.query("update check_results_internal set released_at = now(), held_at = null where job_id = $1", [input.jobId]);
    await logAction(c, input.jobId, "released", input.actor, row.result_code === input.resultCode ? input.resultCode : `${row.result_code}->${input.resultCode}`);
    await c.query("commit");
    to = row.email;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
  await sendReleaseMail(staff, mailer, input.jobId, to, input.baseUrl, input.actor);
  return "released";
}

/** Sends the release mail again (only if a release exists and the mail has not gone out). */
export async function resendReleaseMail(staff: pg.Pool, mailer: Mailer, input: { jobId: string; actor: string; baseUrl: string }): Promise<boolean> {
  if (!UUID.test(input.jobId)) return false;
  const r = await staff.query(
    `select u.email from check_results_public p join users u on u.id = p.user_id where p.job_id = $1 and p.mail_sent_at is null`,
    [input.jobId],
  );
  if (!r.rowCount) return false;
  await sendReleaseMail(staff, mailer, input.jobId, r.rows[0].email, input.baseUrl, input.actor);
  return true;
}

/** Keeps the result back ("Zurückhalten, persönlich melden"): nothing is released, Sebastian contacts the customer himself. */
export async function holdResult(staff: pg.Pool, input: { jobId: string; actor: string }): Promise<boolean> {
  if (!UUID.test(input.jobId)) return false;
  const r = await staff.query("update check_results_internal set held_at = now() where job_id = $1 and released_at is null and held_at is null", [input.jobId]);
  if (r.rowCount) await logAction(staff, input.jobId, "held", input.actor);
  return !!r.rowCount;
}
