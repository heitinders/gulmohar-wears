// The app's Supabase adapters against a real local Supabase (Auth, PostgREST, RLS) started with `supabase start`.
// Run with `npm run test:supabase`. Skips when no local stack is running.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAuth, createSupabaseStore, createSupabaseStudioData } from "../../src/lib/fit/server/supabase-store.ts";
import { checkClient, registerClient } from "../../src/lib/fit/server/register.ts";
import { updatePreference } from "../../src/lib/fit/server/preference.ts";
import { requireStaff } from "../../src/lib/fit/server/studio.ts";
import { createRateLimiter } from "../../src/lib/fit/server/rate-limit.ts";
import { verifyClientToken } from "../../src/lib/fit/server/token.ts";
import { CONSENT_VERSION } from "../../src/lib/fit/consent.ts";

const env: Record<string, string> = (() => {
  try {
    const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], cwd: new URL("../../", import.meta.url).pathname });
    return Object.fromEntries(out.split("\n").map(l => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map(m => [m![1], m![2]]));
  } catch { return {}; }
})();
const URL_ = env.API_URL; const ANON = env.ANON_KEY; const SERVICE = env.SERVICE_ROLE_KEY;
const skip = !(URL_ && ANON && SERVICE) && "local Supabase is not running";
const SECRET = "integration-test-token-secret";
const stamp = Date.now();
const staff = { email: `staff${stamp}@example.com`, password: `staff-${stamp}-password` };
const outsider = { email: `other${stamp}@example.com`, password: `other-${stamp}-password` };
const phone = `+9198${String(stamp).slice(-8)}`;

before(async () => {
  if (skip) return;
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const s = await admin.auth.admin.createUser({ email: staff.email, password: staff.password, email_confirm: true });
  await admin.auth.admin.createUser({ email: outsider.email, password: outsider.password, email_confirm: true });
  const { error } = await admin.from("studio_staff").insert({ user_id: s.data.user!.id, email: staff.email });
  assert.equal(error, null);
});

test("gate, token, preference sync and usage through the service-role store", { skip }, async () => {
  const store = createSupabaseStore(URL_, SERVICE);
  const deps = { store, secret: SECRET, limiter: createRateLimiter({ limit: 100, windowMs: 1000 }), now: () => new Date() };
  const a = await registerClient(deps, { name: "Simran", phone, country: "IN", consent: true, consentVersion: CONSENT_VERSION, website: "", ip: "1.1.1.1" });
  const b = await registerClient(deps, { name: "Simran Kaur", phone, country: "IN", consent: true, consentVersion: CONSENT_VERSION, website: "", ip: "1.1.1.1" });
  assert.ok(a.ok && b.ok); assert.equal(a.token, b.token);
  const check = await checkClient(deps, b.token); assert.ok(check.ok); assert.equal(check.name, "Simran Kaur");
  assert.deepEqual(await updatePreference(deps, b.token, { style: "farshi", fit: "fitted", lengthNote: "longer", brief: { city: "Leeds", notes: "bust 34" }, measures: { bust: 86 } }), { ok: true });
  const v = verifyClientToken(b.token, SECRET); assert.ok(v.ok);
  const row = (await store.getClient(v.clientId))!;
  assert.equal(row.style, "farshi"); assert.equal(row.lengthNote, "longer"); assert.deepEqual(row.brief, { city: "Leeds" });
  const key = `${phone}-usage`;
  assert.equal(await store.bumpUsage(key, "2026-10-03", "tryons"), 1);
  assert.equal(await store.bumpUsage(key, "2026-10-03", "tryons"), 2);
  assert.equal(await store.bumpUsage(key, "2026-10-03", "reports"), 1);
  assert.deepEqual(await store.getUsage(key, "2026-10-03"), { tryons: 2, reports: 1 });
});

test("staff sign in through Supabase Auth and see clients through RLS; others see nothing", { skip }, async () => {
  const auth = createSupabaseAuth(URL_, ANON);
  assert.deepEqual(await auth.signIn(staff.email, "wrong-password"), { ok: false });
  const s = await auth.signIn(staff.email, staff.password); const o = await auth.signIn(outsider.email, outsider.password);
  assert.ok(s.ok && o.ok);
  assert.ok(s.session.expiresAt > Date.now() / 1000);
  const deps = { auth, studioData: (t: string) => createSupabaseStudioData(URL_, ANON, t) };
  const asStaff = await requireStaff(deps, { access: s.session.accessToken }); assert.ok(asStaff.ok);
  assert.deepEqual(await requireStaff(deps, { access: o.session.accessToken }), { ok: false, reason: "not-staff" });
  assert.deepEqual(await requireStaff(deps, { access: "not-a-jwt" }), { ok: false, reason: "signed-out" });
  const staffData = createSupabaseStudioData(URL_, ANON, s.session.accessToken);
  const otherData = createSupabaseStudioData(URL_, ANON, o.session.accessToken);
  const mine = (await staffData.listClients()).find(c => c.phone === phone);
  assert.ok(mine); assert.equal(mine.fit, "fitted");
  assert.deepEqual(await otherData.listClients(), []);
  assert.equal(await otherData.deleteClient(mine.id), false);
  const refreshed = await auth.refresh(s.session.refreshToken);
  assert.ok(refreshed); assert.ok((await auth.getUser(refreshed.accessToken))?.email === staff.email);
  assert.equal(await auth.refresh("not-a-refresh-token"), null);
  assert.equal(await staffData.deleteClient(mine.id), true);
  assert.equal((await staffData.listClients()).some(c => c.phone === phone), false);
});

test("the anon key alone reads and writes nothing", { skip }, async () => {
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  for (const t of ["fit_clients", "fit_usage", "studio_staff"]) {
    const { data } = await anon.from(t).select("*");
    assert.equal((data ?? []).length, 0, t);
  }
  const { error } = await anon.from("fit_clients").insert({ phone_e164: "+447400123456", name: "x", consent_at: new Date().toISOString(), consent_version: "v" });
  assert.ok(error);
  const rpc = await anon.rpc("fit_bump_usage", { p_key: "x", p_day: "2026-10-03", p_field: "tryons" });
  assert.ok(rpc.error);
});
