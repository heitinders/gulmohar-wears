import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { checkClient, registerClient } from "./register.ts";
import { updatePreference } from "./preference.ts";
import { createMemoryStore, newMemoryState, type FitStore } from "./store.ts";
import { createRateLimiter } from "./rate-limit.ts";
import { signClientToken, verifyClientToken } from "./token.ts";
import { CONSENT_VERSION } from "../consent.ts";

const SECRET = "test-secret-for-the-fit-gate-only";
const NOW = new Date("2026-10-03T09:30:00.000Z");
const deps = (store: FitStore = createMemoryStore()) => ({ store, secret: SECRET, limiter: createRateLimiter({ limit: 10, windowMs: 3_600_000 }), now: () => NOW });
const form = (over: Record<string, unknown> = {}) => ({ name: " Simran ", phone: "98765 43210", country: "IN", consent: true, consentVersion: CONSENT_VERSION, website: "", ip: "1.2.3.4", ...over });

test("a valid gate submit stores the client and returns a token for that row", async () => {
  const d = deps();
  const r = await registerClient(d, form());
  assert.ok(r.ok); assert.equal(r.phone, "+919876543210"); assert.equal(r.name, "Simran");
  const v = verifyClientToken(r.token, SECRET); assert.ok(v.ok);
  const row = await d.store.getClient(v.clientId);
  assert.equal(row?.name, "Simran"); assert.equal(row?.consentVersion, CONSENT_VERSION); assert.equal(row?.consentAt, NOW.toISOString());
});

test("the same phone twice gets the same token and the newer name", async () => {
  const d = deps();
  const a = await registerClient(d, form()); const b = await registerClient(d, form({ name: "Simran Kaur", phone: "+91 98765 43210" }));
  assert.ok(a.ok && b.ok); assert.equal(a.token, b.token);
  const v = verifyClientToken(b.token, SECRET); assert.ok(v.ok);
  assert.equal((await d.store.getClient(v.clientId))?.name, "Simran Kaur");
});

test("name must be 1 to 80 characters after trimming", async () => {
  assert.deepEqual(await registerClient(deps(), form({ name: "   " })), { ok: false, error: "name" });
  assert.deepEqual(await registerClient(deps(), form({ name: "x".repeat(81) })), { ok: false, error: "name" });
  assert.deepEqual(await registerClient(deps(), form({ name: 42 })), { ok: false, error: "name" });
  assert.ok((await registerClient(deps(), form({ name: "x".repeat(80) }))).ok);
});

test("an invalid phone names the selected country", async () => {
  assert.deepEqual(await registerClient(deps(), form({ phone: "7400 1234" })), { ok: false, error: "phone", countryName: "India" });
  assert.deepEqual(await registerClient(deps(), form({ phone: "12", country: "GB" })), { ok: false, error: "phone", countryName: "United Kingdom" });
  const fallback = await registerClient(deps(), form({ country: "ZZ" }));
  assert.ok(fallback.ok, "an unknown country falls back to India, the default region"); assert.equal(fallback.phone, "+919876543210");
});

test("consent must be given for the current wording", async () => {
  assert.deepEqual(await registerClient(deps(), form({ consent: false })), { ok: false, error: "consent" });
  assert.deepEqual(await registerClient(deps(), form({ consent: "on" })), { ok: false, error: "consent" });
  assert.deepEqual(await registerClient(deps(), form({ consentVersion: "fit-consent-2025-01-01" })), { ok: false, error: "consent" });
});

test("a filled honeypot looks like success to the bot and writes nothing", async () => {
  const state = newMemoryState(); const d = deps(createMemoryStore(undefined, state));
  const r = await registerClient(d, form({ website: "http://spam.example" }));
  assert.equal(r.ok, true); assert.equal(state.clients.size, 0);
  assert.ok(r.ok); assert.equal(verifyClientToken(r.token, SECRET).ok, false);
});

test("the eleventh attempt from one address in an hour is refused", async () => {
  const d = deps();
  for (let i = 0; i < 10; i++) assert.ok((await registerClient(d, form({ phone: `98765 4321${i}` }))).ok);
  assert.deepEqual(await registerClient(d, form()), { ok: false, error: "rate" });
  assert.ok((await registerClient(d, form({ ip: "5.6.7.8" }))).ok);
});

test("a store failure is reported as unavailable and nothing is logged", async () => {
  const broken = { ...createMemoryStore(), upsertClient: async () => { throw new Error("connect ECONNREFUSED with +919876543210"); } };
  const spies = (["log", "error", "warn", "info", "debug"] as const).map(m => mock.method(console, m, () => {}));
  try {
    assert.deepEqual(await registerClient(deps(broken), form()), { ok: false, error: "unavailable" });
    for (const s of spies) assert.equal(s.mock.callCount(), 0);
  } finally { spies.forEach(s => s.mock.restore()); }
});

test("checking a token returns the name and a masked phone", async () => {
  const d = deps(); const r = await registerClient(d, form()); assert.ok(r.ok);
  assert.deepEqual(await checkClient(d, r.token), { ok: true, name: "Simran", phoneMasked: "+91 ••••••3210" });
});

test("a tampered, foreign or deleted token is invalid", async () => {
  const state = newMemoryState(); const d = deps(createMemoryStore(undefined, state));
  const r = await registerClient(d, form()); assert.ok(r.ok);
  assert.deepEqual(await checkClient(d, r.token.slice(0, -2) + "xx"), { ok: false, error: "invalid-token" });
  assert.deepEqual(await checkClient(d, signClientToken("6f1c2a7e-3b4d-4c5e-8f90-123456789abc", SECRET)), { ok: false, error: "invalid-token" });
  state.clients.clear();
  assert.deepEqual(await checkClient(d, r.token), { ok: false, error: "invalid-token" });
});

test("checking while the store is down is unavailable, not invalid", async () => {
  const d = deps(); const r = await registerClient(d, form()); assert.ok(r.ok);
  const down = { ...d, store: { ...d.store, getClient: async () => { throw new Error("down"); } } };
  assert.deepEqual(await checkClient(down, r.token), { ok: false, error: "unavailable" });
});

test("preference sync writes only whitelisted fields for the token's own row", async () => {
  const d = deps(); const r = await registerClient(d, form()); assert.ok(r.ok);
  const res = await updatePreference(d, r.token, { fit: "relaxed", style: "sharara", measures: { bust: 86 }, heightCm: 160, name: "Hacker", phone: "+447400123456", brief: { city: "Leeds", notes: "34 bust" } });
  assert.deepEqual(res, { ok: true });
  const v = verifyClientToken(r.token, SECRET); assert.ok(v.ok);
  const row = (await d.store.getClient(v.clientId))!;
  assert.equal(row.fit, "relaxed"); assert.equal(row.style, "sharara"); assert.equal(row.name, "Simran"); assert.equal(row.phone, "+919876543210");
  assert.deepEqual(row.brief, { city: "Leeds" });
  for (const key of ["measures", "heightCm", "weightKg", "age", "photo"]) assert.equal(key in row, false, key);
  assert.doesNotMatch(JSON.stringify(row.brief), /34|bust|notes/);
});

test("preference sync refuses bad tokens and reports outages", async () => {
  const d = deps(); const r = await registerClient(d, form()); assert.ok(r.ok);
  assert.deepEqual(await updatePreference(d, "nope", { fit: "fitted" }), { ok: false, error: "invalid-token" });
  const down = { ...d, store: { ...d.store, updatePreference: async () => { throw new Error("down"); } } };
  assert.deepEqual(await updatePreference(down, r.token, { fit: "fitted" }), { ok: false, error: "unavailable" });
});
