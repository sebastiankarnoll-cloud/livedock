"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPool } from "../../lib/db.ts";
import { getMailer } from "../../lib/mail.ts";
import { requestLoginLink, consumeLoginToken, endSession, InputError } from "../../lib/auth.ts";
import { COOKIE } from "../../lib/session.ts";

export async function requestLink(formData: FormData) {
  const pool = getPool();
  try {
    await requestLoginLink(pool, getMailer(pool), {
      email: String(formData.get("email") ?? ""),
      consent: formData.get("consent") === "on",
      baseUrl: process.env.PUBLIC_URL ?? "http://localhost:3000",
    });
  } catch (e) {
    if (e instanceof InputError) redirect(`/anmelden?fehler=${e.code}`);
    throw e;
  }
  redirect("/postfach");
}

export async function confirmLogin(formData: FormData) {
  const s = await consumeLoginToken(getPool(), String(formData.get("t") ?? ""));
  if (!s) redirect("/anmelden?fehler=link");
  const jar = await cookies();
  jar.set(COOKIE, s.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: s.expiresAt,
  });
  redirect("/verbinden");
}

export async function logout() {
  const jar = await cookies();
  await endSession(getPool(), jar.get(COOKIE)?.value);
  jar.delete(COOKIE);
  redirect("/anmelden");
}
