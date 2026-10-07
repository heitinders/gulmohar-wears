import { test } from "node:test";
import assert from "node:assert/strict";
import { STUDIO_KEY, createStudioStore, type StudioEntryInput } from "./studio-store.ts";
import { ratioMeasures } from "./estimate.ts";
import { FIELDS, type Values } from "./measures.ts";
import type { StorageLike } from "./device-store.ts";

const memory = (): StorageLike & { map: Map<string, string> } => { const map = new Map<string, string>(); return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: k => { map.delete(k); } }; };
const throwing: StorageLike = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("denied"); } };
const values = Object.fromEntries(FIELDS.map(f => [f, ratioMeasures(162.56, null, "punjabi")[f]])) as Values;
const entry: StudioEntryInput = { phone: "+919876543210", name: "Simran", styleId: "punjabi", heightCm: 162.56, fit: "regular", measures: values, confidence: { bust: 48 }, source: "studio-fit" };

test("uses the studio key from the spec", () => { assert.equal(STUDIO_KEY, "gulmohar_studio_measures_v1"); });

test("one entry per phone; saving again replaces it", () => {
  const s = createStudioStore(memory());
  assert.equal(s.save(entry), true); assert.equal(s.save({ ...entry, name: "Simran Kaur" }), true);
  assert.equal(s.list().length, 1); assert.equal(s.get("+919876543210")?.name, "Simran Kaur");
  assert.ok(s.get("+919876543210")?.savedAt);
});

test("tailor corrections sit beside the draft values, never over them", () => {
  const s = createStudioStore(memory()); s.save(entry);
  assert.equal(s.attachTailor("+919876543210", { bust: 88.9 }, ["bust", "waist"]), true);
  const e = s.get("+919876543210")!;
  assert.equal(e.measures.bust, values.bust); assert.equal(e.tailor?.values.bust, 88.9);
  assert.deepEqual(e.tailor?.verified, ["bust", "waist"]); assert.ok(e.tailor?.at);
  assert.equal(s.attachTailor("+447400123456", { bust: 1 }, []), false);
});

test("a fresh draft for the same client keeps earlier tailor corrections", () => {
  const s = createStudioStore(memory()); s.save(entry); s.attachTailor(entry.phone, { hip: 100 }, ["hip"]);
  s.save({ ...entry, source: "import" });
  assert.equal(s.get(entry.phone)?.tailor?.values.hip, 100); assert.equal(s.get(entry.phone)?.source, "import");
});

test("remove and broken storage", () => {
  const s = createStudioStore(memory()); s.save(entry);
  assert.equal(s.remove(entry.phone), true); assert.equal(s.list().length, 0);
  const b = createStudioStore(throwing);
  assert.deepEqual(b.list(), []); assert.equal(b.save(entry), false); assert.equal(b.get(entry.phone), null);
});

test("corrupt data reads as empty", () => {
  const m = memory(); m.map.set(STUDIO_KEY, "{oops"); assert.deepEqual(createStudioStore(m).list(), []);
  m.map.set(STUDIO_KEY, JSON.stringify({ not: "a list" })); assert.deepEqual(createStudioStore(m).list(), []);
});
