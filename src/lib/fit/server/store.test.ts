import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "./store.ts";

const consent = { consentAt: "2026-10-03T10:00:00.000Z", consentVersion: "fit-consent-2026-10-02" };

test("upsert on the same phone keeps the id and updates name and consent", async () => {
  const s = createMemoryStore();
  const a = await s.upsertClient({ phone: "+919876543210", name: "Simran", ...consent });
  const b = await s.upsertClient({ phone: "+919876543210", name: "Simran Kaur", consentAt: "2026-10-04T10:00:00.000Z", consentVersion: "fit-consent-2026-10-02" });
  assert.equal(a.id, b.id); assert.equal(b.phone, "+919876543210");
  const row = await s.getClient(a.id);
  assert.equal(row?.name, "Simran Kaur"); assert.equal(row?.consentAt, "2026-10-04T10:00:00.000Z");
  assert.match(a.id, /^[0-9a-f-]{36}$/);
});

test("different phones are different clients", async () => {
  const s = createMemoryStore();
  const a = await s.upsertClient({ phone: "+919876543210", name: "A", ...consent });
  const b = await s.upsertClient({ phone: "+447400123456", name: "B", ...consent });
  assert.notEqual(a.id, b.id);
});

test("preference updates write only the patch and move updatedAt", async () => {
  let t = 1_000;
  const s = createMemoryStore(() => new Date(t));
  const { id } = await s.upsertClient({ phone: "+919876543210", name: "A", ...consent });
  t = 2_000;
  assert.equal(await s.updatePreference(id, { fit: "relaxed", brief: { city: "Leeds" } }), true);
  const row = (await s.getClient(id))!;
  assert.equal(row.fit, "relaxed"); assert.deepEqual(row.brief, { city: "Leeds" }); assert.equal(row.style, null);
  assert.equal(row.updatedAt, new Date(2_000).toISOString());
  await s.updatePreference(id, { brief: null });
  assert.equal((await s.getClient(id))!.brief, null);
});

test("an unknown client is null and cannot be updated", async () => {
  const s = createMemoryStore();
  assert.equal(await s.getClient("6f1c2a7e-3b4d-4c5e-8f90-123456789abc"), null);
  assert.equal(await s.updatePreference("6f1c2a7e-3b4d-4c5e-8f90-123456789abc", { fit: "fitted" }), false);
});

test("usage counts per key and day, tryons and reports separately", async () => {
  const s = createMemoryStore();
  assert.deepEqual(await s.getUsage("+919876543210", "2026-10-03"), { tryons: 0, reports: 0 });
  assert.equal(await s.bumpUsage("+919876543210", "2026-10-03", "tryons"), 1);
  assert.equal(await s.bumpUsage("+919876543210", "2026-10-03", "tryons"), 2);
  assert.equal(await s.bumpUsage("+919876543210", "2026-10-03", "reports"), 1);
  assert.equal(await s.bumpUsage("+919876543210", "2026-10-04", "tryons"), 1);
  assert.deepEqual(await s.getUsage("+919876543210", "2026-10-03"), { tryons: 2, reports: 1 });
  assert.deepEqual(await s.getUsage("staff:x", "2026-10-03"), { tryons: 0, reports: 0 });
});

test("rows returned are copies, so callers cannot change the store", async () => {
  const s = createMemoryStore();
  const { id } = await s.upsertClient({ phone: "+919876543210", name: "A", ...consent });
  const row = (await s.getClient(id))!; row.name = "Changed";
  assert.equal((await s.getClient(id))!.name, "A");
});
