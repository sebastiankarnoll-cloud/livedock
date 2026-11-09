import type pg from "pg";

export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

/** Development mailer: stores mails in the outbox table. Nothing leaves the machine. */
export function devMailer(pool: pg.Pool): Mailer {
  return {
    async send(to, subject, body) {
      await pool.query("insert into outbox(to_email, subject, body) values ($1, $2, $3)", [to, subject, body]);
    },
  };
}

export function getMailer(pool: pg.Pool): Mailer {
  const kind = process.env.MAILER ?? "dev";
  if (kind === "dev") return devMailer(pool);
  // A real EU mail service is added later. Never fall back silently.
  throw new Error(`MAILER=${kind} is not implemented`);
}
