import { cookies } from "next/headers";
import { getPool } from "./db.ts";
import { getSessionUser } from "./auth.ts";

export const COOKIE = "ld_session";

export async function currentUser() {
  const jar = await cookies();
  return getSessionUser(getPool(), jar.get(COOKIE)?.value);
}
