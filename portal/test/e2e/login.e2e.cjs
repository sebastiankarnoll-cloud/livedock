// Click-through test in a real browser. Needs the built app running (npm run build && npm start) and a migrated dev database.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.E2E_URL || "http://localhost:3100";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const email = `e2e-${Date.now()}@firma.de`;

  await page.goto(base + "/");
  assert.match(page.url(), /\/anmelden$/);

  // missing consent: browser blocks (required), so test the server message with a bad address instead
  await page.fill("#email", email);
  await page.check("input[name=consent]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/postfach");
  assert.ok(await page.getByText("Schau in Dein Postfach.").isVisible());

  await page.goto(base + "/dev/postfach");
  const link = await page.locator("a", { hasText: "/anmelden/bestaetigen?t=" }).first().getAttribute("href");
  assert.ok(link);

  // opening the link must NOT log in yet
  await page.goto(link);
  assert.ok(await page.getByRole("button", { name: "Jetzt anmelden" }).isVisible());
  await page.goto(base + "/verbinden");
  assert.match(page.url(), /\/anmelden$/, "link opened but no login before button");

  await page.goto(link);
  await page.click("button[type=submit]");
  await page.waitForURL("**/verbinden");
  assert.ok(await page.getByText("Angemeldet als " + email).isVisible());

  const cookie = (await ctx.cookies()).find((c) => c.name === "ld_session");
  assert.ok(cookie && cookie.httpOnly && cookie.sameSite === "Lax");

  // link is single use
  const page2 = await (await browser.newContext()).newPage();
  await page2.goto(link);
  await page2.click("button[type=submit]");
  await page2.waitForURL("**/anmelden?fehler=link");
  assert.ok(await page2.getByText("abgelaufen oder wurde schon benutzt").isVisible());

  await page.screenshot({ path: process.env.E2E_SHOT || "/tmp/portal-verbinden.png" });
  await page.click("text=Abmelden");
  await page.waitForURL("**/anmelden");
  await page.goto(base + "/verbinden");
  assert.match(page.url(), /\/anmelden$/);

  await browser.close();
  console.log("e2e ok");
})().catch((e) => { console.error(e); process.exit(1); });
