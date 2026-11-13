import { createHash, randomBytes } from "node:crypto";
import type pg from "pg";
import type { Mailer } from "./mail.ts";

export const CONSENT_VERSION = "2026-11-09";
export const LOGIN_TOKEN_MINUTES = 15;
export const SESSION_DAYS = 14;
const MAX_LINKS_PER_WINDOW = 5; // per e-mail address within LOGIN_TOKEN_MINUTES

export class InputError extends Error {
  code: "email" | "consent";
  constructor(code: "email" | "consent", message: string) {
    super(message);
    this.code = code;
  }
}

// Plain addresses only. No quotes, brackets, commas or semicolons: the address goes into a mail header.
const EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

/**
 * Sends a login link. The answer never reveals whether an account exists
 * (same result for new, known and rate-limited addresses).
 */
export async function requestLoginLink(
  pool: pg.Pool,
  mailer: Mailer,
  input: { email: string; consent: boolean; baseUrl: string },
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) throw new InputError("email", "Bitte gib eine gültige E-Mail-Adresse ein.");
  if (!input.consent) throw new InputError("consent", "Bitte bestätige den Datenschutzhinweis.");

  const u = await pool.query(
    `insert into users(email, consent_at, consent_version) values ($1, now(), $2)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [email, CONSENT_VERSION],
  );
  const userId: string = u.rows[0].id;

  const recent = await pool.query(
    `select count(*)::int as n from login_tokens
     where user_id = $1 and created_at > now() - make_interval(mins => $2)`,
    [userId, LOGIN_TOKEN_MINUTES],
  );
  if (recent.rows[0].n >= MAX_LINKS_PER_WINDOW) return; // silently ignored

  const token = newToken();
  await pool.query(
    `insert into login_tokens(user_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3))`,
    [userId, hashToken(token), LOGIN_TOKEN_MINUTES],
  );
  const link = `${input.baseUrl.replace(/\/$/, "")}/anmelden/bestaetigen?t=${token}`;
  await mailer.send(
    email,
    "Dein Anmelde-Link für livedock.",
    `Klicke auf den Link, um Dich anzumelden. Der Link gilt ${LOGIN_TOKEN_MINUTES} Minuten und nur einmal.\n\n${link}\n\nWenn Du das nicht warst, kannst Du diese Mail ignorieren.`,
  );
}

/**
 * Called only when the person presses the button on the confirmation page
 * (not on opening the link), so mail filters that open links do not use it up.
 * One use only; returns null for unknown, expired or used tokens.
 */
export async function consumeLoginToken(
  pool: pg.Pool,
  token: string,
): Promise<{ sessionToken: string; userId: string; expiresAt: Date } | null> {
  const r = await pool.query(
    `update login_tokens set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning user_id`,
    [hashToken(token)],
  );
  if (r.rowCount === 0) return null;
  const userId: string = r.rows[0].user_id;
  await pool.query("update users set verified_at = coalesce(verified_at, now()) where id = $1", [userId]);
  const sessionToken = newToken();
  const s = await pool.query(
    `insert into sessions(user_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(days => $3)) returning expires_at`,
    [userId, hashToken(sessionToken), SESSION_DAYS],
  );
  return { sessionToken, userId, expiresAt: s.rows[0].expires_at };
}

export async function getSessionUser(pool: pg.Pool, sessionToken: string | undefined) {
  if (!sessionToken) return null;
  const r = await pool.query(
    `select u.id, u.email, s.created_at as session_at from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(sessionToken)],
  );
  return r.rowCount ? (r.rows[0] as { id: string; email: string; session_at: Date }) : null;
}

export async function endSession(pool: pg.Pool, sessionToken: string | undefined) {
  if (sessionToken) await pool.query("delete from sessions where token_hash = $1", [hashToken(sessionToken)]);
}
