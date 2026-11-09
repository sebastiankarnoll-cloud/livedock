import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";

const NewCourse = z.object({
  title: z.string().min(3).max(120),
  starts_on: z.string().date(),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = NewCourse.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const { data, error } = await supabase
    .from("courses")
    .insert({ ...parsed.data, owner_id: auth.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: "could not save" }, { status: 500 });
  return NextResponse.json(data);
}
