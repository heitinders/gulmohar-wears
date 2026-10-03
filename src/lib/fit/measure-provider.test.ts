import { test } from "node:test";
import assert from "node:assert/strict";
import { OnDeviceProvider, measureFromHeight } from "./measure-provider.ts";
import { FRONT, SIDE, IMG, HEIGHT_64_IN, makeLandmarks } from "./fixtures.ts";
import type { PoseDetector, DecodedImage } from "./pose.ts";
import type { Landmarks } from "./measures.ts";

const blob = (tag: string) => new Blob([tag]);
const fakeDeps = (byTag: Record<string, Landmarks | null>, failLoad = false) => ({
  loadDetector: async (): Promise<PoseDetector> => { if (failLoad) throw new Error("wasm blocked"); return { detect: (s) => byTag[(s as unknown as { tag: string }).tag] ?? null, close() {} }; },
  decode: async (b: Blob): Promise<DecodedImage> => ({ source: { tag: await b.text() } as unknown as CanvasImageSource, w: IMG.w, h: IMG.h }),
});
const input = { front: blob("front"), side: blob("side"), heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" as const };

test("front and side photos give a landmarks-mode draft with confidence", async () => {
  const r = await new OnDeviceProvider(fakeDeps({ front: FRONT, side: SIDE })).measure(input);
  assert.equal(r.ok, true); if (!r.ok) return;
  assert.equal(r.measures.mode, "landmarks"); assert.equal(r.measures.bust, 89.7); assert.equal(r.confidence.bust, 97); assert.equal(r.quality.ok, true);
});

test("a hard pose issue blocks unless forced", async () => {
  const arms = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55], L_WRIST: [0.5, 0.45], R_WRIST: [0.78, 0.55], L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93], L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95] });
  const provider = new OnDeviceProvider(fakeDeps({ front: arms, side: SIDE }));
  const blocked = await provider.measure(input);
  assert.equal(blocked.ok, false); if (!blocked.ok && blocked.reason === "pose-blocked") assert.equal(blocked.quality.issues[0].code, "arms-blocking");
  const forced = await provider.measure({ ...input, force: true });
  assert.equal(forced.ok, true); if (forced.ok) assert.ok(forced.measures.warnings.some(w => /pose quality/.test(w)));
});

test("no pose in the front photo falls back to the height ratios", async () => {
  const r = await new OnDeviceProvider(fakeDeps({ front: null, side: SIDE })).measure({ ...input, force: true });
  // 42 + 0.3 * 38 = 53.4, minus 18 because "no-front" is a hard issue = 35.4, under the no-front cap of 48. Same as app.js, which also passes quality here.
  assert.equal(r.ok, true); if (r.ok) { assert.equal(r.measures.mode, "ratio"); assert.equal(r.confidence.bust, 35); }
});

test("a model that cannot load reports model-unavailable", async () => {
  const r = await new OnDeviceProvider(fakeDeps({}, true)).measure(input);
  assert.deepEqual(r, { ok: false, reason: "model-unavailable" });
});

test("measureFromHeight is the ratio draft at capped confidence", () => {
  const r = measureFromHeight(HEIGHT_64_IN, null, "anarkali");
  assert.equal(r.measures.kameez, 94.3); assert.equal(r.confidence.kameez, 48);
});
