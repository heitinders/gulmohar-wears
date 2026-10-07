import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_USAGE_KEY, MAX_TRYON_BYTES, handleReport, handleTryOn, indiaDay, type TryOnDeps } from "./tryon.ts";
import { createMemoryStore, newMemoryState } from "./store.ts";
import { signClientToken } from "./token.ts";
import { TryOnError, createFakeProvider, type TryOnProvider } from "./tryon-provider.ts";
import type { TryOnConfig } from "./config.ts";

const SECRET = "tryon-test-secret-value";
const DAY = "2026-10-03";
const config: TryOnConfig = { available: true, provider: "fake", model: "fake", dailyCap: 6, studioCap: 30, globalCap: 500 };
const jpeg = (bytes = 10) => new Blob([Buffer.alloc(bytes, 1)], { type: "image/jpeg" });

async function setup(over: Partial<TryOnDeps> = {}) {
  const state = newMemoryState(); const store = createMemoryStore(undefined, state);
  const { id } = await store.upsertClient({ phone: "+919876543210", name: "Simran", consentAt: "c", consentVersion: "v" });
  const deps: TryOnDeps = { config, store, secret: SECRET, provider: createFakeProvider(), loadGarment: async slug => (slug === "olive-gold-suit" ? jpeg(20) : null), staff: async () => null, today: () => DAY, ...over };
  return { deps, store, token: signClientToken(id, SECRET) };
}
const form = (entries: Record<string, string | Blob>) => { const f = new FormData(); for (const [k, v] of Object.entries(entries)) f.append(k, v); return f; };
const call = (deps: TryOnDeps, entries: Record<string, string | Blob>, contentLength: number | null = 1000) => handleTryOn(deps, { contentLength, readForm: async () => form(entries) });

test("a valid request returns the preview and counts one try-on", async () => {
  const { deps, store, token } = await setup();
  const r = await call(deps, { token, look: "olive-gold-suit", person: jpeg() });
  assert.equal(r.status, 200); assert.ok(r.image); assert.equal(r.model, "fake"); assert.equal(r.promptVersion, "tryon-2026-10-03");
  assert.equal((await store.getUsage("+919876543210", DAY)).tryons, 1);
});

test("unavailable when the config says so, before reading anything", async () => {
  const { deps, token } = await setup({ config: { ...config, available: false, reason: "paid-tier-unconfirmed" } });
  let read = false;
  const r = await handleTryOn(deps, { contentLength: 10, readForm: async () => { read = true; return form({ token }); } });
  assert.deepEqual([r.status, r.json], [503, { error: "unavailable" }]); assert.equal(read, false);
});

test("an oversized body is refused before it is parsed, and so is a large file without a length header", async () => {
  const { deps, token } = await setup();
  let read = false;
  const r = await handleTryOn(deps, { contentLength: MAX_TRYON_BYTES + 1, readForm: async () => { read = true; return form({}); } });
  assert.equal(r.status, 413); assert.equal(read, false);
  assert.equal((await call(deps, { token, look: "olive-gold-suit", person: jpeg(MAX_TRYON_BYTES + 1) }, null)).status, 413);
  assert.ok(MAX_TRYON_BYTES <= 4 * 1024 * 1024);
});

test("only jpeg, png and webp photos", async () => {
  const { deps, token } = await setup();
  assert.deepEqual((await call(deps, { token, look: "olive-gold-suit", person: new Blob([Buffer.alloc(5)], { type: "image/gif" }) })).json, { error: "type" });
  assert.equal((await call(deps, { token, look: "olive-gold-suit", person: "not a file" })).status, 415);
  assert.equal((await call(deps, { token, look: "olive-gold-suit", person: new Blob([], { type: "image/jpeg" }) })).status, 415);
  for (const type of ["image/png", "image/webp"]) assert.equal((await call(deps, { token, look: "olive-gold-suit", person: new Blob([Buffer.alloc(5)], { type }) })).status, 200, type);
});

test("an unknown look is refused", async () => {
  const { deps, token } = await setup();
  assert.deepEqual(await call(deps, { token, look: "../../etc/passwd", person: jpeg() }), { status: 400, json: { error: "look" } });
});

test("a missing or bad token without a staff session is refused", async () => {
  const { deps, token } = await setup();
  assert.equal((await call(deps, { look: "olive-gold-suit", person: jpeg() })).status, 401);
  assert.deepEqual((await call(deps, { token: token + "x", look: "olive-gold-suit", person: jpeg() })).json, { error: "invalid-token" });
  assert.equal((await call(deps, { token: signClientToken("6f1c2a7e-3b4d-4c5e-8f90-123456789abc", SECRET), look: "olive-gold-suit", person: jpeg() })).status, 401);
});

test("staff use their own key and the studio cap", async () => {
  const { deps, store } = await setup({ staff: async () => ({ id: "staff-1" }), config: { ...config, studioCap: 2 } });
  for (let i = 0; i < 2; i++) assert.equal((await call(deps, { look: "olive-gold-suit", person: jpeg() })).status, 200);
  assert.equal((await call(deps, { look: "olive-gold-suit", person: jpeg() })).status, 429);
  assert.equal((await store.getUsage("staff:staff-1", DAY)).tryons, 2);
  assert.equal((await store.getUsage("+919876543210", DAY)).tryons, 0);
});

test("the sixth preview is allowed and the seventh refused with a WhatsApp way out", async () => {
  const { deps, store, token } = await setup();
  for (let i = 0; i < 5; i++) await store.bumpUsage("+919876543210", DAY, "tryons");
  assert.equal((await call(deps, { token, look: "olive-gold-suit", person: jpeg() })).status, 200);
  const r = await call(deps, { token, look: "olive-gold-suit", person: jpeg() });
  assert.equal(r.status, 429); assert.equal((r.json as { error: string }).error, "cap");
  assert.match((r.json as { whatsapp: string }).whatsapp, /^https:\/\/wa\.me\/918699841800\?text=/);
  assert.equal((await store.getUsage("+919876543210", DAY)).tryons, 6);
});

test("the cap is per day", async () => {
  const { deps, store, token } = await setup();
  for (let i = 0; i < 6; i++) await store.bumpUsage("+919876543210", "2026-10-02", "tryons");
  assert.equal((await call(deps, { token, look: "olive-gold-suit", person: jpeg() })).status, 200);
});

test("a vendor failure or timeout does not use the allowance", async () => {
  for (const [codeName, status] of [["vendor", 502], ["timeout", 504], ["blocked", 422], ["no-image", 502]] as const) {
    const failing: TryOnProvider = { async tryOn() { throw new TryOnError(codeName); } };
    const { deps, store, token } = await setup({ provider: failing });
    const r = await call(deps, { token, look: "olive-gold-suit", person: jpeg() });
    assert.deepEqual([r.status, r.json], [status, { error: codeName }], codeName);
    assert.equal((await store.getUsage("+919876543210", DAY)).tryons, 0, codeName);
  }
});

test("a database outage is unavailable", async () => {
  const { deps, token } = await setup();
  const down = { ...deps, store: { ...deps.store, getClient: async () => { throw new Error("down"); } } };
  assert.equal((await call(down, { token, look: "olive-gold-suit", person: jpeg() })).status, 503);
});

test("reports count only reports, need an identity, and are refused when try-on is off", async () => {
  const { deps, store, token } = await setup();
  assert.deepEqual(await handleReport(deps, { token }), { status: 200, json: { ok: true } });
  assert.deepEqual(await store.getUsage("+919876543210", DAY), { tryons: 0, reports: 1 });
  assert.equal((await handleReport(deps, {})).status, 401);
  assert.equal((await handleReport({ ...deps, config: { ...config, available: false } }, { token })).status, 503);
});

test("nothing is logged on any path, so images, tokens and phones never reach logs", async () => {
  const spies = (["log", "error", "warn", "info", "debug"] as const).map(m => mock.method(console, m, () => {}));
  try {
    const { deps, token } = await setup();
    const failing: TryOnProvider = { async tryOn() { throw new TryOnError("vendor"); } };
    await call(deps, { token, look: "olive-gold-suit", person: jpeg() });
    await call({ ...deps, provider: failing }, { token, look: "olive-gold-suit", person: jpeg() });
    await call(deps, { token: "bad", look: "olive-gold-suit", person: jpeg() });
    await call({ ...deps, store: { ...deps.store, getUsage: async () => { throw new Error("+919876543210 down"); } } }, { token, look: "olive-gold-suit", person: jpeg() });
    await handleReport(deps, { token });
    for (const s of spies) assert.equal(s.mock.callCount(), 0);
  } finally { spies.forEach(s => s.mock.restore()); }
});

test("the day rolls over at midnight in India", () => {
  assert.equal(indiaDay(new Date("2026-10-03T18:29:59Z")), "2026-10-03");
  assert.equal(indiaDay(new Date("2026-10-03T18:30:00Z")), "2026-10-04");
});

test("ten requests at once with five used make exactly one more preview", async () => {
  const slow: TryOnProvider = { async tryOn({ garment }) { await new Promise(r => setTimeout(r, 20)); return { image: garment, model: "fake", promptVersion: "p" }; } };
  const { deps, store, token } = await setup({ provider: slow });
  for (let i = 0; i < 5; i++) await store.bumpUsage("+919876543210", DAY, "tryons");
  const results = await Promise.all(Array.from({ length: 10 }, () => call(deps, { token, look: "olive-gold-suit", person: jpeg() })));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 429).length, 9);
  assert.equal((await store.getUsage("+919876543210", DAY)).tryons, 6);
});

test("a deployment-wide daily ceiling stops all previews, and failures give the slot back", async () => {
  const { deps, store, token } = await setup({ config: { ...config, globalCap: 2 } });
  assert.equal((await call(deps, { token, look: "olive-gold-suit", person: jpeg() })).status, 200);
  const failing: TryOnProvider = { async tryOn() { throw new TryOnError("vendor"); } };
  assert.equal((await call({ ...deps, provider: failing }, { token, look: "olive-gold-suit", person: jpeg() })).status, 502);
  assert.equal((await store.getUsage(GLOBAL_USAGE_KEY, DAY)).tryons, 1);
  const other = await store.upsertClient({ phone: "+447400123456", name: "B", consentAt: "c", consentVersion: "v" });
  const otherToken = signClientToken(other.id, SECRET);
  assert.equal((await call(deps, { token: otherToken, look: "olive-gold-suit", person: jpeg() })).status, 200);
  const third = await call(deps, { token: otherToken, look: "olive-gold-suit", person: jpeg() });
  assert.equal(third.status, 429); assert.equal((third.json as { error: string }).error, "cap");
  assert.equal((await store.getUsage("+447400123456", DAY)).tryons, 1, "a refused request leaves the phone's count alone");
});
