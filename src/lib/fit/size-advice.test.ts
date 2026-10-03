import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendSize, sizeAdviceLine } from "./size-advice.ts";
import { ratioMeasures } from "./estimate.ts";
import { FIT_EASE } from "./fit-preference.ts";

const withGirths = (bust: number, waist: number, hip: number) => ({ ...ratioMeasures(162.56, null, "punjabi"), bust, waist, hip });

test("ease values match the prototype", () => {
  assert.deepEqual(FIT_EASE, { fitted: -1.0, regular: 0, relaxed: 2.5 });
});

test("34 / 27 / 36 in regular is a ready S", () => {
  const a = recommendSize(withGirths(86.4, 68.6, 91.4), "regular");
  assert.equal(a.size, "S"); assert.equal(a.closest, "S"); assert.equal(a.mtm, false);
  assert.equal(sizeAdviceLine(a), "Your closest Gulmohar size is S. Ready stock is possible.");
});

test("38 / 32 / 44 in is closest to L but the hip needs made to measure", () => {
  const a = recommendSize(withGirths(96.5, 81.3, 111.8), "regular");
  assert.equal(a.size, "L"); assert.equal(a.closest, "L"); assert.equal(a.mtm, true);
  assert.ok(a.reasons.includes("hip-over"));
  assert.equal(sizeAdviceLine(a), "Your closest Gulmohar size is L. We recommend made to measure because the hip needs 2 in more than the L chart.");
});

test("a bust outside 34 to 42 in is Custom with the nearest band as closest", () => {
  const a = recommendSize(withGirths(112, 81.3, 111.8), "regular");
  assert.equal(a.size, "Custom"); assert.equal(a.closest, "XL"); assert.equal(a.mtm, true);
  assert.ok(a.reasons.includes("bust-outside-band"));
});

test("fitted ease lowers the girths before the chart (prototype behaviour, see Decisions 3)", () => {
  const a = recommendSize(withGirths(86.4, 68.6, 91.4), "fitted");
  assert.equal(a.bustIn.toFixed(2), "33.62");
  assert.equal(a.size, "Custom");
});

test("relaxed ease adds room and notes it", () => {
  const a = recommendSize(withGirths(86.4, 68.6, 91.4), "relaxed");
  assert.equal(a.size, "S"); assert.equal(a.mtm, false); assert.ok(a.reasons.includes("relaxed-room"));
});
