import { notFound, redirect } from "next/navigation";
import { currentUser } from "../../lib/session.ts";
import { getStaffPool } from "../../lib/db.ts";
import { isStaff, sessionFresh } from "../../lib/staff.ts";

/**
 * Guard for the control center. Everyone who is not staff gets a plain "not found" (the page does not
 * reveal that it exists). Staff need a fresh login (8 hours) and the control center must be switched on.
 */
export async function requireStaff() {
  const user = await currentUser();
  if (!user || !isStaff(user.email)) notFound();
  if (!sessionFresh(user.session_at)) redirect("/anmelden");
  let staff;
  try {
    staff = getStaffPool();
  } catch {
    notFound();
  }
  return { user, staff };
}
