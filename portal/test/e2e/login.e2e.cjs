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
  assert.ok(await page.getByText("Lade Dein Projekt als ZIP-Datei hoch.").isVisible());
  assert.ok(await page.getByText("Abmelden (" + email + ")").isVisible());

  // upload: wrong file first, then a real zip
  const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
  const txt = path.join(os.tmpdir(), "kein-zip.zip");
  fs.writeFileSync(txt, "kein zip");
  await page.setInputFiles("#zip", txt);
  await page.click("text=Hochladen und weiter");
  await page.getByText("Das ist keine ZIP-Datei.").waitFor();
  const { execFileSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proj-"));
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"x"}');
  const zip = path.join(os.tmpdir(), "e2e-proj.zip");
  fs.rmSync(zip, { force: true });
  execFileSync("python3", ["-c", "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1],'w');z.write(sys.argv[2]+'/package.json','package.json');z.close()", zip, dir]);
  await page.setInputFiles("#zip", zip);
  await page.click("text=Hochladen und weiter");
  await page.getByText("Dein Projekt ist angekommen.").waitFor();
  assert.ok(await page.getByText("e2e-proj.zip: 1 Dateien").isVisible());

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
