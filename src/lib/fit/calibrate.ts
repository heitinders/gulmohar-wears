import { GIRTH_KEYS, type Measures } from "./measures.ts";
import { round1 } from "./units.ts";

export interface Calibration { field: "bust" | "waist"; tapeCm: number; scale: number; lengthTapeCm: number | null }
export type CalibrationResult = { ok: true; measures: Measures; calibration: Calibration } | { ok: false; error: "tape-out-of-range" | "scale-out-of-range" };

// Ported from app.js applyTapeCalibration (L1284-1345). Pure: returns a new Measures, never mutates raw.
export function applyTapeCalibration(raw: Measures, field: "bust" | "waist", tapeCm: number, lengthTapeCm: number | null = null): CalibrationResult {
  if (!tapeCm || tapeCm < 40 || tapeCm > 160) return { ok: false, error: "tape-out-of-range" };
  const scale = tapeCm / raw[field];
  // The prototype refuses a missing or non-positive estimate before dividing; a non-finite scale covers that here.
  if (!Number.isFinite(scale) || scale < 0.7 || scale > 1.4) return { ok: false, error: "scale-out-of-range" };
  const next: Measures = { ...raw, sources: { ...raw.sources }, warnings: [...raw.warnings] };
  for (const k of GIRTH_KEYS) { next[k] = round1(raw[k] * scale); next.sources[k] = "calibrated"; }
  next[field] = round1(tapeCm);
  let lengthCal: number | null = null;
  if (lengthTapeCm && lengthTapeCm > 20 && lengthTapeCm < 180 && raw.kameez) {
    const lengthScale = lengthTapeCm / raw.kameez;
    if (lengthScale >= 0.7 && lengthScale <= 1.4) {
      for (const k of ["kameez", "sleeve", "salwar"] as const) { next[k] = round1(raw[k] * lengthScale); next.sources[k] = "calibrated"; }
      next.kameez = round1(lengthTapeCm);
      lengthCal = round1(lengthTapeCm);
    }
  }
  next.calibrated = true;
  return { ok: true, measures: next, calibration: { field, tapeCm: round1(tapeCm), scale: round1(scale * 1000) / 1000, lengthTapeCm: lengthCal } };
}
