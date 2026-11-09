import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { courseId, question } = await req.json();

  const { data: people } = await db
    .from("participants")
    .select("name, email, notes")
    .eq("course_id", courseId);

  // Names, emails and notes go to OpenAI, user input is pasted into the prompt.
  const prompt = `Participants: ${JSON.stringify(people)}\nTask: ${question}`;

  const out = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });
  return NextResponse.json({ answer: out.choices[0]?.message?.content });
}
