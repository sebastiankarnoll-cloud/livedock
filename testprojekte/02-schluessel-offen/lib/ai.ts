import OpenAI from "openai";

// TESTPROJEKT: the placeholder below is replaced by a fake key in the format
// of a real OpenAI key by testprojekte/materialize.sh before every test run.
const client = new OpenAI({
  apiKey: "@@OPENAI_TEST_KEY@@",
});

export async function summarize(text: string) {
  const out = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    messages: [
      { role: "system", content: "Summarize in two sentences." },
      { role: "user", content: text },
    ],
  });
  return out.choices[0]?.message?.content ?? "";
}
