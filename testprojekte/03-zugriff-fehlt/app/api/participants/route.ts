import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// No login check: anyone who knows the URL can read and write.
export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  const { data } = await db
    .from("participants")
    .select("*")
    .eq("course_id", courseId);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data } = await db.from("participants").insert(body).select();
  return NextResponse.json(data);
}
