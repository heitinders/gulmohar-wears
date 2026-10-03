import type { Field, Landmarks, Measures } from "./measures.ts";
import type { StyleId } from "./styles.ts";
import { landmarkMeasures, ratioMeasures } from "./estimate.ts";
import { assessPoseQuality, type PoseQuality } from "./retake.ts";
import { computeConfidence } from "./confidence.ts";
import { decodeImage, loadPoseDetector, type DecodedImage, type PoseDetector } from "./pose.ts";

export interface MeasureInput { front: Blob; side: Blob | null; heightCm: number; kameezOverrideCm: number | null; styleId: StyleId; force?: boolean }
export type MeasureOutcome =
  | { ok: true; measures: Measures; confidence: Record<Field, number>; quality: PoseQuality; frontLm: Landmarks | null; sideLm: Landmarks | null }
  | { ok: false; reason: "pose-blocked"; quality: PoseQuality }
  | { ok: false; reason: "model-unavailable" };

/** The seam a future vendor would implement. Release 1 has one implementation. */
export interface MeasureProvider { measure(input: MeasureInput): Promise<MeasureOutcome> }

interface Deps { loadDetector(): Promise<PoseDetector>; decode(blob: Blob): Promise<DecodedImage> }

export class OnDeviceProvider implements MeasureProvider {
  // A plain field, not a parameter property: node --experimental-strip-types cannot strip parameter properties.
  private readonly deps: Deps;
  constructor(deps: Deps = { loadDetector: loadPoseDetector, decode: decodeImage }) { this.deps = deps; }

  // Ported from app.js processMeasurements (L2008-2090), without the tailor-bias step (deferred).
  async measure(input: MeasureInput): Promise<MeasureOutcome> {
    let detector: PoseDetector;
    try { detector = await this.deps.loadDetector(); } catch { return { ok: false, reason: "model-unavailable" }; }
    const front = await this.deps.decode(input.front);
    const frontLm = detector.detect(front.source);
    let side: DecodedImage | null = null, sideLm: Landmarks | null = null;
    if (input.side) { side = await this.deps.decode(input.side); sideLm = detector.detect(side.source); }
    const quality = assessPoseQuality(frontLm, sideLm);
    if (quality.hard && !input.force) return { ok: false, reason: "pose-blocked", quality };
    let measures: Measures;
    if (frontLm) {
      measures = landmarkMeasures({ front: { lm: frontLm, w: front.w, h: front.h }, side: sideLm && side ? { lm: sideLm, w: side.w, h: side.h } : null, heightCm: input.heightCm, kameezOverrideCm: input.kameezOverrideCm, styleId: input.styleId });
      if (input.force && quality.hard) measures.warnings.push("Forced estimate despite pose quality issues, expect larger error.");
    } else {
      measures = ratioMeasures(input.heightCm, input.kameezOverrideCm, input.styleId);
      measures.warnings.push("No pose found in the front photo, this draft uses height only.");
    }
    const confidence = computeConfidence(measures, frontLm, sideLm, quality, false);
    return { ok: true, measures, confidence, quality, frontLm, sideLm };
  }
}

/** The "Use height only" path. Ported from the demo path, app.js L2735. */
export function measureFromHeight(heightCm: number, kameezOverrideCm: number | null, styleId: StyleId) {
  const measures = ratioMeasures(heightCm, kameezOverrideCm, styleId);
  return { measures, confidence: computeConfidence(measures, null, null, null, false) };
}
