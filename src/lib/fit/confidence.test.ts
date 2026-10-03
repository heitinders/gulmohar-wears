import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConfidence, confidenceLevel, sourceLabel } from "./confidence.ts";
import { ratioMeasures, landmarkMeasures } from "./estimate.ts";
import { assessPoseQuality } from "./retake.ts";
import { applyTapeCalibration } from "./calibrate.ts";
import { FRONT, SIDE, IMG, HEIGHT_64_IN } from "./fixtures.ts";
import { FIELDS } from "./measures.ts";

test("height-only drafts without a tape value are capped at 48 everywhere", () => {
  const c = computeConfidence(ratioMeasures(HEIGHT_64_IN, null, "punjabi"), null, null, null, false);
  for (const f of FIELDS) assert.equal(c[f], 48, f); // 42 + 0.3 * 38 = 53.4, capped 55 for ratio, then 48 with no front
});

test("front-only: landmark fields gain 6, clamped fields lose 14", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const c = computeConfidence(m, FRONT, null, assessPoseQuality(FRONT, null), false);
  assert.equal(c.shoulder, 86 - 8); // 42 + 38 + 6, minus 8 for the soft "no side" issue
  assert.equal(c.bust, 66 - 8); // 42 + 38 - 14, minus 8
});

test("front and side: girths get the side boost and cap at 97", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: { lm: SIDE, ...IMG }, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const c = computeConfidence(m, FRONT, SIDE, assessPoseQuality(FRONT, SIDE), false);
  assert.equal(c.bust, 97); // 42 + 38 + 10 + 12 = 102, capped
  assert.equal(c.shoulder, 90); // 42 + 38 + 10 (source is landmark+side in landmarks mode), no side boost for lengths
});

test("a hard pose issue costs 18", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: { lm: SIDE, ...IMG }, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const c = computeConfidence(m, FRONT, SIDE, { ok: false, hard: true, issues: [{ code: "arms-blocking", hard: true, side: false }] }, false);
  assert.equal(c.shoulder, 72); // 90 - 18
});

test("calibration lifts girths to at least 90 and is recomputed", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const r = applyTapeCalibration(m, "bust", 86);
  if (!r.ok) throw new Error("expected ok");
  const c = computeConfidence(r.measures, FRONT, null, assessPoseQuality(FRONT, null), true);
  assert.equal(c.bust, 96 - 8); // 80, +18 capped 96, then max(_, 90) capped 97, minus 8 soft penalty
  assert.equal(c.shoulder, 86 - 8); // lengths unchanged
});

test("a tape-measured girth on a height-only draft is not capped by the missing front photo", () => {
  const r = applyTapeCalibration(ratioMeasures(HEIGHT_64_IN, null, "anarkali"), "bust", 86.4);
  if (!r.ok) throw new Error("expected ok");
  const c = computeConfidence(r.measures, null, null, null, true);
  assert.equal(c.bust, 90); // 53.4 capped 55, +18 = 71.4, calibrated floor 90, no front cap for "calibrated" (Decisions 8)
  assert.equal(c.waist, 90); // every girth is rescaled by the tape, so its source is "calibrated" too
  assert.equal(c.shoulder, 48); // lengths still come from height alone, so the no-front cap stays
});

test("levels and labels", () => {
  assert.equal(confidenceLevel(85), "high");
  assert.equal(confidenceLevel(70), "mid");
  assert.equal(confidenceLevel(69), "low");
  assert.equal(sourceLabel("landmark+side", "bust", "punjabi"), "photo and side");
  assert.equal(sourceLabel("ratio-clamped", "bust", "punjabi"), "from height");
  assert.equal(sourceLabel("landmark", "kameez", "anarkali"), "from height"); // Decisions 2
  assert.equal(sourceLabel("landmark", "neck", "punjabi"), "from height"); // Decisions 1
  assert.equal(sourceLabel("calibrated", "bust", "punjabi"), "your tape");
});
