import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshSessionCookies, requireStaff } from "./studio.ts";
import { createMemoryAuth, createMemoryStudioData, type StudioAuth } from "./studio-auth.ts";
import { newMemoryState } from "./store.ts";

const users = [{ email: "staff@example.com", password: "staff-password-long", staff: true }, { email: "other@example.com", password: "other-password-long", staff: false }];
const world = (now = () => 0) => { const state = newMemoryState(); const auth = createMemoryAuth(users, now); return { auth, studioData: (t: string) => createMemoryStudioData(auth, state, t) }; };

test("no cookie is signed out", async () => {
  assert.deepEqual(await requireStaff(world(), {}), { ok: false, reason: "signed-out" });
  assert.deepEqual(await requireStaff(world(), { access: "made-up" }), { ok: false, reason: "signed-out" });
});

test("a signed-in user who is not on the staff list is refused", async () => {
  const w = world(); const s = await w.auth.signIn("other@example.com", "other-password-long"); assert.ok(s.ok);
  assert.deepEqual(await requireStaff(w, { access: s.session.accessToken }), { ok: false, reason: "not-staff" });
});

test("staff get their user and token back", async () => {
  const w = world(); const s = await w.auth.signIn("staff@example.com", "staff-password-long"); assert.ok(s.ok);
  const r = await requireStaff(w, { access: s.session.accessToken });
  assert.ok(r.ok); assert.equal(r.user.email, "staff@example.com"); assert.equal(r.accessToken, s.session.accessToken);
});

test("an auth outage is unavailable, not signed out", async () => {
  const broken: StudioAuth = { ...world().auth, getUser: async () => { throw new Error("down"); } };
  assert.deepEqual(await requireStaff({ auth: broken, studioData: world().studioData }, { access: "x" }), { ok: false, reason: "unavailable" });
});

test("cookies are left alone until a minute before expiry", async () => {
  const w = world();
  assert.equal(await refreshSessionCookies(w.auth, { refresh: "r", expires: "1000" }, 900), null);
  assert.equal(await refreshSessionCookies(w.auth, {}, 900), null);
});

test("near expiry the session is refreshed, and a dead refresh clears the cookies", async () => {
  let t = 0; const w = world(() => t);
  const s = await w.auth.signIn("staff@example.com", "staff-password-long"); assert.ok(s.ok);
  t = 3590;
  const r = await refreshSessionCookies(w.auth, { access: s.session.accessToken, refresh: s.session.refreshToken, expires: String(s.session.expiresAt) }, t);
  assert.ok(r && "set" in r && r.set); assert.notEqual(r.set.accessToken, s.session.accessToken);
  const again = await refreshSessionCookies(w.auth, { refresh: s.session.refreshToken, expires: String(s.session.expiresAt) }, t);
  assert.deepEqual(again, { clear: true });
  assert.deepEqual(await refreshSessionCookies(w.auth, { refresh: "r", expires: "garbage" }, 0), { clear: true });
});

test("a refresh that throws clears nothing, so a blip does not sign staff out", async () => {
  const broken: StudioAuth = { ...world().auth, refresh: async () => { throw new Error("down"); } };
  assert.equal(await refreshSessionCookies(broken, { refresh: "r", expires: "0" }, 100), null);
});
