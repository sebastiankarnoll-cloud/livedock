"use server";
import { redirect } from "next/navigation";
import { currentUser } from "../../lib/session.ts";
import { getPool } from "../../lib/db.ts";
import { acknowledgeAcute } from "../../lib/ergebnis.ts";

export async function confirmRenewed(fd: FormData) {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  if (fd.get("done") !== "on") redirect("/ergebnis/akut?fehler=1");
  await acknowledgeAcute(getPool(), user.id);
  redirect("/ergebnis");
}
