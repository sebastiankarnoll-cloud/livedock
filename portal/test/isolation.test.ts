import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { ensureCase, listCases } from "../lib/cases.ts";
import { withUser } from "../lib/db.ts";
import { pools, reset } from "./helpers.ts";

const { app, admin } = pools();
let a = "";
let b = "";
before(async () => {
  await reset(admin);
  const ins = (e: string) => admin.query("insert into users(email, consent_at, consent_version) values ($1, now(), 'x') returning id", [e]).then((r) => r.rows[0].id as string);
  a = await ins("a@firma.de");
  b = await ins("b@firma.de");
});
after(async () => {
  await app.end();
  await admin.end();
});

test("jeder Kunde sieht nur seinen eigenen Fall", async () => {
  const ca = await ensureCase(app, a);
  const cb = await ensureCase(app, b);
  assert.notEqual(ca.id, cb.id);
  assert.deepEqual((await listCases(app, a)).map((r) => r.id), [ca.id]);
  assert.deepEqual((await listCases(app, b)).map((r) => r.id), [cb.id]);
});

test("ensureCase legt pro Kunde nur einen Fall an", async () => {
  await ensureCase(app, a);
  await ensureCase(app, a);
  assert.equal((await listCases(app, a)).length, 1);
});

test("Ohne Benutzerbindung sind keine Fälle sichtbar, auch nicht mit select *", async () => {
  const r = await app.query("select * from cases");
  assert.equal(r.rowCount, 0);
});

test("Auch eine ausdrückliche Abfrage nach fremden Zeilen liefert nichts und schreiben geht nicht", async () => {
  const other = (await withUser(admin, b, (c) => c.query("select id from cases"))).rows[0].id; // owner role is also bound by RLS (force)
  await withUser(app, a, async (c) => {
    assert.equal((await c.query("select * from cases where id = $1", [other])).rowCount, 0);
    assert.equal((await c.query("select * from cases where user_id = $1", [b])).rowCount, 0);
    assert.equal((await c.query("update cases set delete_after = now() where id = $1", [other])).rowCount, 0);
    assert.equal((await c.query("delete from cases where id = $1", [other])).rowCount, 0);
  });
  await assert.rejects(withUser(app, a, (c) => c.query("insert into cases(user_id) values ($1)", [b])), /row-level security/);
  assert.equal((await withUser(admin, b, (c) => c.query("select count(*)::int n from cases"))).rows[0].n, 1);
});

test("Die App-Rolle kann die Zeilensicherheit nicht umgehen", async () => {
  const r = await app.query("select rolsuper, rolbypassrls from pg_roles where rolname = current_user");
  assert.equal(r.rows[0].rolsuper, false);
  assert.equal(r.rows[0].rolbypassrls, false);
});
