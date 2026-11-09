import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { summarize } from "@/lib/ai";

const Input = z.object({ courseId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", parsed.data.courseId)
    .single();
  if (!course) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ summary: await summarize(course.title) });
}
