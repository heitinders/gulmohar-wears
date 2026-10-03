import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryAuth, createMemoryStudioData, needsRefresh, sessionCookieOptions, SESSION_COOKIES } from "./studio-auth.ts";
import { createMemoryStore, newMemoryState } from "./store.ts";
import { fromDbRow, toDbPatch } from "./supabase-store.ts";

const staff = { email: "staff@example.com", password: "correct horse battery", staff: true };
const outsider = { email: "someone@example.com", password: "another long password", staff: false };

test("signs in with the right password only", async () => {
  const t = 0; const auth = createMemoryAuth([staff, outsider], () => t);
  assert.deepEqual(await auth.signIn("staff@example.com", "wrong"), { ok: false });
  assert.deepEqual(await auth.signIn("nobody@example.com", "correct horse battery"), { ok: false });
  const r = await auth.signIn(" Staff@Example.com ", "correct horse battery");
  assert.ok(r.ok); assert.equal(r.session.expiresAt, 3600);
  const user = await auth.getUser(r.session.accessToken);
  assert.equal(user?.email, "staff@example.com");
});

test("an expired access token has no user, refresh issues a new pair once", async () => {
  let t = 0; const auth = createMemoryAuth([staff], () => t);
  const r = await auth.signIn(staff.email, staff.password); assert.ok(r.ok);
  t = 3601; assert.equal(await auth.getUser(r.session.accessToken), null);
  const next = await auth.refresh(r.session.refreshToken);
  assert.ok(next); assert.notEqual(next.accessToken, r.session.accessToken);
  assert.equal((await auth.getUser(next.accessToken))?.email, staff.email);
  assert.equal(await auth.refresh(r.session.refreshToken), null, "refresh tokens are single use");
});

test("sign out ends the session", async () => {
  const auth = createMemoryAuth([staff]);
  const r = await auth.signIn(staff.email, staff.password); assert.ok(r.ok);
  await auth.signOut(r.session.accessToken);
  assert.equal(await auth.getUser(r.session.accessToken), null);
  assert.equal(await auth.refresh(r.session.refreshToken), null);
});

test("studio data behaves like the RLS policies", async () => {
  const state = newMemoryState(); const store = createMemoryStore(undefined, state);
  const auth = createMemoryAuth([staff, outsider]);
  await store.upsertClient({ phone: "+919876543210", name: "Simran", consentAt: "2026-10-03T00:00:00Z", consentVersion: "v" });
  const s = await auth.signIn(staff.email, staff.password); const o = await auth.signIn(outsider.email, outsider.password);
  assert.ok(s.ok && o.ok);
  const asStaff = createMemoryStudioData(auth, state, s.session.accessToken);
  const asOutsider = createMemoryStudioData(auth, state, o.session.accessToken);
  const staffUser = (await auth.getUser(s.session.accessToken))!; const outsiderUser = (await auth.getUser(o.session.accessToken))!;
  assert.equal(await asStaff.isStaff(staffUser.id), true);
  assert.equal(await asOutsider.isStaff(outsiderUser.id), false);
  assert.equal((await asOutsider.listClients()).length, 0);
  const rows = await asStaff.listClients(); assert.equal(rows.length, 1);
  assert.equal(await asOutsider.deleteClient(rows[0].id), false);
  assert.equal(await asStaff.deleteClient(rows[0].id), true);
  assert.equal((await asStaff.listClients()).length, 0);
});

test("refresh is due within a minute of expiry", () => {
  assert.equal(needsRefresh(1000, 900), false);
  assert.equal(needsRefresh(1000, 940), true);
  assert.equal(needsRefresh(1000, 2000), true);
  assert.equal(needsRefresh(Number.NaN, 0), true);
});

test("cookies are http-only, lax and site-wide, secure when asked", () => {
  assert.deepEqual(sessionCookieOptions(true), { httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 60 * 60 * 24 * 7 });
  assert.equal(sessionCookieOptions(false).secure, false);
  assert.deepEqual(SESSION_COOKIES, { access: "gw_studio_at", refresh: "gw_studio_rt", expires: "gw_studio_exp" });
});

test("database rows map to client rows and back without extra fields", () => {
  const row = fromDbRow({ id: "a", phone_e164: "+919876543210", name: "S", consent_at: "c", consent_version: "v", style: "punjabi", fit: null, sleeve: null, neckline: null, length_note: "x", brief: { city: "Leeds" }, source: "fit-app", created_at: "1", updated_at: "2" });
  assert.deepEqual(row, { id: "a", phone: "+919876543210", name: "S", consentAt: "c", consentVersion: "v", style: "punjabi", fit: null, sleeve: null, neckline: null, lengthNote: "x", brief: { city: "Leeds" }, createdAt: "1", updatedAt: "2" });
  assert.deepEqual(toDbPatch({ fit: "relaxed", lengthNote: "y", brief: null }), { fit: "relaxed", length_note: "y", brief: null });
  assert.deepEqual(toDbPatch({}), {});
});
