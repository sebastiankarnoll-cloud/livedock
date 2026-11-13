// Control center in a real browser. Needs the built app running with STAFF_EMAILS and DATABASE_STAFF_URL set,
// and a migrated dev database. Seeds one acute case directly in the database.
const { chromium } = require("playwright");
const pg = require("pg");
const assert = require("node:assert/strict");
const base = process.env.E2E_URL || "http://localhost:3100";
const staffEmail = (process.env.STAFF_EMAILS || "").split(",")[0].trim();

async function login(page, email) {
  await page.goto(base + "/anmelden");
  await page.fill("#email", email);
  await page.check("input[name=consent]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/postfach");
  await page.goto(base + "/dev/postfach");
  const link = await page.locator("a", { hasText: "/anmelden/bestaetigen?t=" }).first().getAttribute("href");
  await page.goto(link);
  await page.click("button[type=submit]");
  await page.waitForURL("**/verbinden");
}

(async () => {
  assert.ok(staffEmail, "STAFF_EMAILS missing");
  const db = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL });
  await db.connect();
  const cust = `kunde-${Date.now()}@firma.de`;
  const u = (await db.query("insert into users(email, consent_at, consent_version) values ($1, now(), 'x') returning id", [cust])).rows[0].id;
  await db.query("begin");
  await db.query("select set_config('app.user_id', $1, true)", [u]);
  const c = (await db.query("insert into cases(user_id) values ($1) returning id", [u])).rows[0].id;
  const j = (await db.query("insert into jobs(case_id, user_id, status, finished_at) values ($1,$2,'done',now()) returning id", [c, u])).rows[0].id;
  await db.query("commit");
  const res = { engineVersion: "t", stack: { status: "unterstuetzt", kind: "nextjs", features: { supabase: false, ai: [], validation: false }, fileCount: 3 }, result: "akuter_fund", basis: "behebbar", reviewHint: false, positives: [], acute: true, areas: [],
    findings: [{ id: "f1", area: "geheimnisse", severity: "hoch", kategorie: "Schlüssel im Code", auswirkung: "x", bereich: "Code", konfidenz: 0.95, acute: true, hinweis: "sk-…ab12", intern: { datei: "lib/geheim.ts", zeile: 3, regel: "key" } }] };
  await db.query("insert into check_results_internal(job_id, case_id, user_id, engine_version, result_code, result_json) values ($1,$2,$3,'t','akuter_fund',$4)", [j, c, u, JSON.stringify(res)]);

  const browser = await chromium.launch();

  // A customer must not even learn that the control center exists.
  const kp = await (await browser.newContext()).newPage();
  await login(kp, cust);
  const r404 = await kp.goto(base + "/steuerzentrale");
  assert.equal(r404.status(), 404);
  const r404b = await kp.goto(base + "/steuerzentrale/" + j);
  assert.equal(r404b.status(), 404);

  // Staff
  const sp = await (await browser.newContext()).newPage();
  await login(sp, staffEmail);
  await sp.goto(base + "/steuerzentrale");
  await sp.getByText("Sofortmeldung").first().waitFor();
  await sp.getByRole("link", { name: /Akut/ }).first().click();
  await sp.getByRole("heading", { name: "Ergebnis prüfen und freigeben" }).waitFor();
  await sp.getByText("Funde mit Beleg ansehen").click();
  await sp.getByText("lib/geheim.ts:3").waitFor();
  await sp.selectOption("#result", "behebbar");
  await sp.click("text=Freigeben und an Kunden senden");
  await sp.getByText("Freigegeben. Die Mail an den Kunden ist unterwegs.").waitFor();

  // Customer now lands on the result page and the mail has only a link.
  await kp.goto(base + "/verbinden");
  await kp.waitForURL("**/ergebnis/akut");
  await kp.getByRole("heading", { name: "Bitte erneuere jetzt diese Zugänge." }).waitFor();
  await kp.getByText("sk-…ab12").waitFor();
  assert.ok(!(await kp.content()).includes("geheim.ts"), "keine Datei im Kundenbild");
  await kp.goto(base + "/ergebnis"); // not before the confirmation
  await kp.waitForURL("**/ergebnis/akut");
  await kp.click("text=Erledigt, weiter zum Ergebnis");
  await kp.getByText("Bitte bestätige zuerst").waitFor();
  await kp.check("#done");
  await kp.click("text=Erledigt, weiter zum Ergebnis");
  await kp.waitForURL(/\/ergebnis$/);
  await kp.getByRole("heading", { name: "Dein Tool lässt sich sicher live bringen." }).waitFor();
  await kp.getByText("Ergebnis: Behebbar").waitFor();
  await kp.click("text=Die Punkte ansehen");
  await kp.getByRole("heading", { name: /wichtigsten Punkte/ }).waitFor();
  await kp.getByText("Schlüssel im Code").waitFor();
  assert.ok(!(await kp.content()).includes("geheim.ts"));
  const mail = (await db.query("select body from outbox where to_email = $1 and subject = 'Dein Ergebnis ist da'", [cust])).rows;
  assert.equal(mail.length, 1);
  assert.ok(mail[0].body.includes("/ergebnis") && !/geheim|sk-/.test(mail[0].body));
  console.log("staff e2e ok");
  await browser.close();
  await db.end();
})().catch((e) => { console.error(e); process.exit(1); });
