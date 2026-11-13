"use server";
import { redirect } from "next/navigation";
import { requireStaff } from "./guard.ts";
import { getPool } from "../../lib/db.ts";
import { getMailer } from "../../lib/mail.ts";
import { holdResult, releaseResult, resendReleaseMail } from "../../lib/staff.ts";

const baseUrl = () => process.env.PUBLIC_URL ?? "http://localhost:3000";
const id = (fd: FormData) => String(fd.get("jobId") ?? "");

export async function release(fd: FormData) {
  const { user, staff } = await requireStaff();
  const out = await releaseResult(staff, getMailer(getPool()), { jobId: id(fd), actor: user.email, resultCode: String(fd.get("result") ?? ""), baseUrl: baseUrl() });
  redirect(`/steuerzentrale?hinweis=${out}`);
}

export async function hold(fd: FormData) {
  const { user, staff } = await requireStaff();
  await holdResult(staff, { jobId: id(fd), actor: user.email });
  redirect("/steuerzentrale?hinweis=held");
}

export async function resendMail(fd: FormData) {
  const { user, staff } = await requireStaff();
  const ok = await resendReleaseMail(staff, getMailer(getPool()), { jobId: id(fd), actor: user.email, baseUrl: baseUrl() });
  redirect(`/steuerzentrale/${id(fd)}?hinweis=${ok ? "mail" : "nomail"}`);
}
