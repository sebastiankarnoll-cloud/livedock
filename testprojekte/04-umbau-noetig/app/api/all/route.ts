// Everything lives in this one file: customers, invoices, AI, search, export.
// No login, no roles. Anyone who knows the URL can do anything.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { Pool } from "pg";
import { execSync } from "node:child_process";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "customers") {
    const { data } = await db.from("customers").select("*");
    return NextResponse.json(data);
  }

  if (action === "search") {
    const term = url.searchParams.get("q");
    const rows = await pool.query(`select * from customers where name ilike '%${term}%'`);
    return NextResponse.json(rows.rows);
  }

  if (action === "export") {
    const file = url.searchParams.get("file");
    const out = execSync(`tar -czf /tmp/${file}.tgz /data`);
    return NextResponse.json({ ok: true, size: out.length });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === "add-customer") {
    const { data } = await db.from("customers").insert(body.customer).select();
    return NextResponse.json(data);
  }

  if (body.action === "calc") {
    const result = eval(body.formula);
    return NextResponse.json({ result });
  }

  if (body.action === "summarize") {
    const { data: people } = await db.from("customers").select("name, email, phone");
    const prompt = `Customers: ${JSON.stringify(people)}\nTask: ${body.question}`;
    const out = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });
    return NextResponse.json({ answer: out.choices[0]?.message?.content });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
