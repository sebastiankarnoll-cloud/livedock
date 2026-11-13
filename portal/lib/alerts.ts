import type pg from "pg";
import type { Mailer } from "./mail.ts";
import { shortId } from "./staff.ts";

/**
 * Immediate alert for an acute finding (decision 09.11.2026): a mail to Sebastian with priority, as soon as
 * the check is done. The mail names no finding and no key (hard rule 2); the customer sees nothing until release.
 * Runs in the worker. A failed send is tried again on the next round.
 */
export async function sendPendingAlerts(worker: pg.Pool, mailer: Mailer, opts: { to: string; baseUrl: string }): Promise<number> {
  const open = await worker.query(
    `select job_id, case_id from check_results_internal
     where alerted_at is null and released_at is null and coalesce((result_json->>'acute')::boolean, false)
     order by created_at`,
  );
  let sent = 0;
  for (const row of open.rows) {
    // Claim first so two workers never send the same alert twice; give it back if sending fails.
    const claim = await worker.query("update check_results_internal set alerted_at = now() where job_id = $1 and alerted_at is null", [row.job_id]);
    if (!claim.rowCount) continue;
    try {
      await mailer.send(
        opts.to,
        `SOFORT: Akuter Fund bei Fall ${shortId(row.case_id)}`,
        `Ein Check hat einen akuten Fund ergeben. Der Kunde sieht nichts, bevor Du freigibst.\n\nJetzt prüfen: ${opts.baseUrl.replace(/\/$/, "")}/steuerzentrale/${row.job_id}\n\nDiese Mail nennt absichtlich keine Details.`,
        { priority: "high" },
      );
      await worker.query("insert into review_log(job_id, action, actor) values ($1, 'alerted', 'system')", [row.job_id]);
      sent++;
    } catch {
      await worker.query("update check_results_internal set alerted_at = null where job_id = $1", [row.job_id]);
    }
  }
  return sent;
}
