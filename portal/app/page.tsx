import { redirect } from "next/navigation";
import { currentUser } from "../lib/session.ts";
import { getPool } from "../lib/db.ts";
import { stageOf, STAGE_PATH } from "../lib/flow.ts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  redirect(STAGE_PATH[(await stageOf(getPool(), user.id)).stage]);
}
