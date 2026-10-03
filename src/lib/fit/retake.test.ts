import { test } from "node:test";
import assert from "node:assert/strict";
import { assessPoseQuality } from "./retake.ts";
import { FRONT, SIDE, makeLandmarks } from "./fixtures.ts";

const codes = (q: ReturnType<typeof assessPoseQuality>) => q.issues.map(i => i.code);

test("a clean front and side pass with no issues", () => {
  const q = assessPoseQuality(FRONT, SIDE);
  assert.equal(q.ok, true); assert.equal(q.hard, false); assert.deepEqual(q.issues, []);
});

test("missing front pose is hard", () => {
  const q = assessPoseQuality(null, SIDE);
  assert.equal(q.hard, true); assert.deepEqual(codes(q), ["no-front"]);
});

test("body too small in frame is hard", () => {
  const small = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.4, 0.2], R_SHOULDER: [0.6, 0.2], L_HIP: [0.45, 0.4], R_HIP: [0.55, 0.4], L_WRIST: [0.2, 0.3], R_WRIST: [0.8, 0.3],
    L_ANKLE: [0.45, 0.60], R_ANKLE: [0.55, 0.60], L_FOOT: [0.45, 0.60], R_FOOT: [0.55, 0.60] });
  assert.ok(codes(assessPoseQuality(small, null)).includes("too-small"));
});

test("feet cropped is hard, head low is soft", () => {
  const cropped = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55], L_WRIST: [0.22, 0.55], R_WRIST: [0.78, 0.55],
    L_ANKLE: [0.42, 0.80], R_ANKLE: [0.58, 0.80], L_FOOT: [0.42, 0.80], R_FOOT: [0.58, 0.80] });
  const q = assessPoseQuality(cropped, SIDE);
  assert.equal(q.hard, true); assert.ok(codes(q).includes("feet-cropped"));
  const low = makeLandmarks({ NOSE: [0.5, 0.25], L_SHOULDER: [0.29, 0.35], R_SHOULDER: [0.71, 0.35], L_HIP: [0.33, 0.6], R_HIP: [0.67, 0.6], L_WRIST: [0.22, 0.6], R_WRIST: [0.78, 0.6],
    L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93], L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95] });
  const s = assessPoseQuality(low, SIDE);
  assert.equal(s.hard, false); assert.deepEqual(codes(s), ["head-low"]);
});

test("a wrist inside the torso at waist height is hard", () => {
  const arms = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55], L_WRIST: [0.5, 0.45], R_WRIST: [0.78, 0.55],
    L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93], L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95] });
  const q = assessPoseQuality(arms, SIDE);
  assert.equal(q.hard, true); assert.deepEqual(codes(q), ["arms-blocking"]);
});

test("a frontal side photo is hard, a missing side photo is soft", () => {
  const frontal = assessPoseQuality(FRONT, FRONT);
  assert.equal(frontal.hard, true); assert.ok(codes(frontal).includes("side-frontal"));
  const none = assessPoseQuality(FRONT, null);
  assert.equal(none.hard, false); assert.deepEqual(codes(none), ["no-side"]);
});
