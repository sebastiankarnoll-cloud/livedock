"use server";
import { redirect } from "next/navigation";
import { currentUser } from "../../lib/session.ts";
import { getPool } from "../../lib/db.ts";
import { startCheck } from "../../lib/flow.ts";

export async function submitAnswers(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  const skip = formData.get("skip") !== null;
  await startCheck(
    getPool(),
    user.id,
    skip
      ? "skip"
      : {
          purpose: String(formData.get("purpose") ?? ""),
          audience: String(formData.get("audience") ?? ""),
          task: String(formData.get("task") ?? ""),
          target: String(formData.get("target") ?? ""),
        },
  );
  redirect("/laeuft");
}
