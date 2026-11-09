import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client using the anon key: every query runs under the user's own
// session, so row level security applies.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => list.forEach((c) => store.set(c.name, c.value, c.options)),
      },
    }
  );
}
