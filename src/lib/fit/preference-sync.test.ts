import { test } from "node:test";
import assert from "node:assert/strict";
import { toPreferencePatch } from "./preference-sync.ts";

test("keeps the whitelisted preference fields", () => {
  assert.deepEqual(toPreferencePatch({ style: "anarkali", fit: "relaxed", sleeve: "cap", neckline: "boat", lengthNote: "  Two inches longer  " }),
    { style: "anarkali", fit: "relaxed", sleeve: "cap", neckline: "boat", lengthNote: "Two inches longer" });
});

test("drops measurements, body data, notes and unknown keys", () => {
  const p = toPreferencePatch({ fit: "fitted", heightCm: 162, measures: { bust: 86 }, weightKg: 60, age: 30, photo: "data:...", brief: { city: "Leeds", notes: "my bust is 34", bust: 86 } });
  assert.deepEqual(p, { fit: "fitted", brief: { city: "Leeds" } });
});

test("refuses values outside the lists", () => {
  assert.deepEqual(toPreferencePatch({ style: "saree", fit: "baggy", sleeve: "long", neckline: "square" }), {});
});

test("caps lengths", () => {
  const p = toPreferencePatch({ lengthNote: "x".repeat(500), brief: { fabric: "y".repeat(500) } });
  assert.equal(p.lengthNote!.length, 200); assert.equal(p.brief!.fabric!.length, 120);
});

test("a deadline must be a real calendar date", () => {
  assert.deepEqual(toPreferencePatch({ brief: { deadline: "2026-12-01" } }).brief, { deadline: "2026-12-01" });
  assert.deepEqual(toPreferencePatch({ brief: { deadline: "next week", city: "Mohali" } }).brief, { city: "Mohali" });
  assert.deepEqual(toPreferencePatch({ brief: { deadline: "2026-02-30" } }).brief, null);
});

test("an empty or blank brief becomes null so the studio sees no order", () => {
  assert.equal(toPreferencePatch({ brief: { occasion: " ", fabric: "", city: "", deadline: "", notes: "x" } }).brief, null);
  assert.equal(toPreferencePatch({ brief: null }).brief, null);
  assert.equal("brief" in toPreferencePatch({ fit: "regular" }), false);
});

test("strips line breaks and never throws on junk", () => {
  assert.equal(toPreferencePatch({ lengthNote: "a\nb\r\nc" }).lengthNote, "a b c");
  for (const junk of [null, undefined, 3, "x", [], { brief: "x" }, { brief: [1] }, { lengthNote: 5 }]) assert.doesNotThrow(() => toPreferencePatch(junk));
});

test("an impossible month or day is dropped rather than throwing", () => {
  assert.deepEqual(toPreferencePatch({ brief: { deadline: "2026-13-45", city: "Mohali" } }).brief, { city: "Mohali" });
});
