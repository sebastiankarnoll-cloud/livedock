import { redirect } from "next/navigation";
import { currentUser } from "../lib/session.ts";
import { getPool } from "../lib/db.ts";
import { stageOf, STAGE_PATH, type Stage } from "../lib/flow.ts";

/** Guard for every customer screen: needs a login and sends people to the screen of their own stage. */
export async function guard(expected: Stage) {
  const user = await currentUser();
  if (!user) redirect("/anmelden");
  const s = await stageOf(getPool(), user.id);
  if (s.stage !== expected) redirect(STAGE_PATH[s.stage]);
  return { user, ...s };
}
