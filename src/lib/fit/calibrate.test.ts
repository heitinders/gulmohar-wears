import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTapeCalibration } from "./calibrate.ts";
import { ratioMeasures } from "./estimate.ts";

const raw = ratioMeasures(162.56, null, "punjabi"); // bust 83.7, waist 65.0, hip 87.8, shoulder 37.2, kameez 73.2, sleeve 50.4, salwar 95.5

test("one bust tape scales every girth and marks them calibrated", () => {
  const r = applyTapeCalibration(raw, "bust", 86);
  assert.equal(r.ok, true); if (!r.ok) return;
  assert.equal(r.measures.bust, 86);
  assert.equal(r.measures.waist, 66.8);      // 65.0 * 86 / 83.7
  assert.equal(r.measures.hip, 90.2);        // 87.8 * 1.02748
  assert.equal(r.measures.shoulder, 37.2);   // lengths are not scaled
  assert.equal(r.measures.sources.waist, "calibrated");
  assert.equal(r.measures.sources.shoulder, "ratio");
  assert.equal(r.measures.calibrated, true);
  assert.deepEqual(r.calibration, { field: "bust", tapeCm: 86, scale: 1.0275, lengthTapeCm: null });
  assert.equal(raw.waist, 65.0, "input is not mutated");
});

test("a kameez length tape scales kameez, sleeve and salwar", () => {
  const r = applyTapeCalibration(raw, "waist", 65, 80);
  assert.equal(r.ok, true); if (!r.ok) return;
  assert.equal(r.measures.kameez, 80);
  assert.equal(r.measures.sleeve, 55.1);     // 50.4 * 80 / 73.2
  assert.equal(r.measures.salwar, 104.4);    // 95.5 * 1.0929
  assert.equal(r.calibration.lengthTapeCm, 80);
});

test("unrealistic tapes and scales are refused", () => {
  assert.deepEqual(applyTapeCalibration(raw, "bust", 30), { ok: false, error: "tape-out-of-range" });
  assert.deepEqual(applyTapeCalibration(raw, "bust", 161), { ok: false, error: "tape-out-of-range" });
  assert.deepEqual(applyTapeCalibration(raw, "bust", 58), { ok: false, error: "scale-out-of-range" }); // 58 / 83.7 = 0.69
});
