import type pg from "pg";
import nodemailer from "nodemailer";

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

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  /** Test only: allow a server without TLS. Never set in production. */
  insecure?: boolean;
}

/** SMTP mailer (e.g. All-inkl). TLS is mandatory: port 465 = TLS from the start, otherwise STARTTLS is required. */
export function smtpMailer(cfg: SmtpConfig): Mailer {
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: !cfg.insecure && cfg.port !== 465,
    ignoreTLS: !!cfg.insecure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return {
    async send(to, subject, body) {
      await transport.sendMail({ from: cfg.from, to, subject, text: body });
    },
  };
}

export function smtpConfigFromEnv(env: Record<string, string | undefined> = process.env): SmtpConfig {
  const need = (k: string) => {
    const v = env[k];
    if (!v) throw new Error(`${k} missing`);
    return v;
  };
  return {
    host: need("SMTP_HOST"),
    port: Number(env.SMTP_PORT ?? 587),
    user: need("SMTP_USER"),
    pass: need("SMTP_PASS"),
    from: need("MAIL_FROM"),
  };
}

export function getMailer(pool: pg.Pool): Mailer {
  const kind = process.env.MAILER ?? "dev";
  if (kind === "dev") return devMailer(pool);
  if (kind === "smtp") return smtpMailer(smtpConfigFromEnv());
  // A real EU mail service is added later. Never fall back silently.
  throw new Error(`MAILER=${kind} is not implemented`);
}
