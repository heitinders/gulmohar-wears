import { test } from "node:test";
import assert from "node:assert/strict";
import { cmPerPxFromHeight, girthCircumference, landmarkMeasures } from "./estimate.ts";
import { FRONT, SIDE, IMG, HEIGHT_64_IN, makeLandmarks } from "./fixtures.ts";
import { FIELDS } from "./measures.ts";

test("scale comes from the nose-to-heel span when the feet are in frame", () => {
  const s = cmPerPxFromHeight(FRONT, IMG.w, IMG.h, HEIGHT_64_IN);
  assert.equal(s.method, "nose-heel");
  assert.equal(s.warning, null);
  assert.equal(s.cmPerPx!.toFixed(5), "0.08893"); // 162.56 * 0.93 / ((0.95 - 0.10) * 2000)
});

test("scale falls back to the torso when the feet are cropped", () => {
  const cropped = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55],
    L_ANKLE: [0.42, 0.80], R_ANKLE: [0.58, 0.80], L_HEEL: [0.42, 0.80], R_HEEL: [0.58, 0.80], L_FOOT: [0.42, 0.80], R_FOOT: [0.58, 0.80] });
  const s = cmPerPxFromHeight(cropped, IMG.w, IMG.h, HEIGHT_64_IN);
  assert.equal(s.method, "nose-hip-fallback");
  assert.equal(s.cmPerPx!.toFixed(5), "0.06502"); // 162.56 * 0.36 / ((0.55 - 0.10) * 2000)
  assert.match(s.warning!, /Feet look cropped/);
});

test("girth is the RMS ellipse with depth and F * pi * k without", () => {
  assert.equal(girthCircumference(35.785, 18.675).toFixed(2), "89.67");
  assert.equal(girthCircumference(30, null).toFixed(2), "89.54"); // 30 * pi * 0.95
  assert.equal(girthCircumference(30, null, 2).toFixed(2), "98.96"); // k clamped to 1.05
  assert.equal(girthCircumference(0, 10), 0);
});

test("front-only estimate: widths from joints, clamp to height ratios, mode hybrid", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  assert.equal(m.mode, "hybrid");
  assert.equal(m.scaleMethod, "nose-heel");
  assert.equal(m.shoulder, 37.4);                // 420 px * 0.08893
  assert.equal(m.sources.shoulder, "landmark");
  assert.equal(m.acrossBack, 32.9);              // shoulder * 0.88
  assert.equal(m.hip, 90.2);                     // 340 px -> 30.236 cm * pi * 0.95
  assert.equal(m.sources.hip, "landmark");
  assert.equal(m.bust, 83.7);                    // 106.8 exceeds 0.515 * H * 1.15, so clamped to the ratio
  assert.equal(m.sources.bust, "ratio-clamped");
  assert.equal(m.sleeve, 53.7);                  // hypot(70, 600) px * 0.08893
  assert.equal(m.kameez, 69.4);                  // shoulder mid to 45% hip-to-knee: 780 px
  assert.equal(m.salwar, 94.3);                  // floor H * (0.60 - 0.02) wins over 760 px - 2
  assert.equal(m.armhole, 35.8);                 // floor 0.22 * H wins
  assert.equal(m.neck, 29.3);                    // floor 0.18 * H wins
  for (const f of FIELDS) assert.ok(Number.isFinite(m[f]), f);
});

test("front and side estimate: depth from the profile, mode landmarks", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: { lm: SIDE, ...IMG }, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  assert.equal(m.mode, "landmarks");
  assert.equal(m.bust, 89.7);                    // ellipse of 35.785 by 18.675 (depth 17.786 * 1.05)
  assert.equal(m.sources.bust, "landmark+side");
  assert.equal(m.hip, 79.6);                     // ellipse of 30.236 by 19.209
  assert.equal(m.waist, 65.0);                   // 83.7 exceeds 0.40 * H * 1.15, so clamped
  assert.equal(m.sources.waist, "ratio-clamped");
  assert.deepEqual(m.warnings, []);
});

test("non-Punjabi styles take kameez from height, and an override wins", () => {
  const a = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "anarkali" });
  assert.equal(a.kameez, 94.3);                  // 0.58 * H
  const o = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: 80, styleId: "anarkali" });
  assert.equal(o.kameez, 80);
});
