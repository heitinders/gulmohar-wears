import { test } from "node:test";
import assert from "node:assert/strict";
import { createProfileStore, PROFILE_KEY, SIX_MONTHS_MS, type StorageLike } from "./device-store.ts";
import { ratioMeasures } from "./estimate.ts";
import { defaultPreference } from "./fit-preference.ts";
import { FIELDS } from "./measures.ts";

const memory = (): StorageLike & { map: Map<string, string> } => { const map = new Map<string, string>(); return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: k => { map.delete(k); } }; };
const measures = ratioMeasures(162.56, null, "punjabi");
const base = { name: "Simran", styleId: "punjabi" as const, heightCm: 162.56, kameezOverrideCm: null, preference: defaultPreference, measures, rawMeasures: null, calibration: null, confidence: Object.fromEntries(FIELDS.map(f => [f, 48])) as Record<(typeof FIELDS)[number], number>, brief: null };

test("save, list, update in place, remove", () => {
  const s = createProfileStore(memory());
  const r = s.save(base); assert.equal(r.ok, true);
  assert.equal(s.list().length, 1);
  const again = s.save({ ...base, id: r.profile!.id, name: "Simran K" });
  assert.equal(s.list().length, 1); assert.equal(s.list()[0].name, "Simran K"); assert.equal(again.profile!.id, r.profile!.id);
  assert.equal(s.remove(r.profile!.id), true); assert.deepEqual(s.list(), []);
});

test("newest first, capped at 10", () => {
  const s = createProfileStore(memory());
  for (let i = 0; i < 12; i++) s.save({ ...base, name: `P${i}` });
  assert.equal(s.list().length, 10); assert.equal(s.list()[0].name, "P11");
});

test("a profile older than six months is stale", () => {
  const s = createProfileStore(memory());
  const p = s.save(base).profile!;
  assert.equal(s.isStale(p, new Date(Date.parse(p.savedAt) + SIX_MONTHS_MS + 1000)), true);
  assert.equal(s.isStale(p, new Date(Date.parse(p.savedAt) + 1000)), false);
});

test("a throwing or missing storage never throws out", () => {
  const throwing: StorageLike = { getItem: () => { throw new Error("quota"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("quota"); } };
  const s = createProfileStore(throwing);
  assert.deepEqual(s.list(), []); assert.equal(s.save(base).ok, false); assert.equal(s.clear(), false);
  const none = createProfileStore(null);
  assert.deepEqual(none.list(), []); assert.equal(none.save(base).ok, false);
});

test("corrupt JSON under the key is treated as empty", () => {
  const m = memory(); m.setItem(PROFILE_KEY, "{not json");
  assert.deepEqual(createProfileStore(m).list(), []);
});
