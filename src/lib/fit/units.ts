// Ported from app.js CM_PER_IN (L537).
export const CM_PER_IN = 2.54;
// Ported from app.js round1 (L532-534).
export const round1 = (n: number) => Math.round(n * 10) / 10;
// Ported from app.js cmToIn (L538-541), without the display rounding.
export const cmToIn = (cm: number) => cm / CM_PER_IN;
// Ported from app.js inToCm (L542-545).
export const inToCm = (inch: number) => inch * CM_PER_IN;

const QUARTERS = ["", "¼", "½", "¾"];

/** Shown instead of a number when a length is missing, not finite or negative. No dashes in customer copy. */
export const NO_MEASURE = "n/a";
const isLength = (cm: number) => Number.isFinite(cm) && cm >= 0;

// Ported from app.js fmtIn (L547-550), changed to quarter-inch display.
/** Display only. Rounds to the nearest quarter inch, e.g. 33¼ in. Returns NO_MEASURE for NaN, infinite or negative input. */
export function formatIn(cm: number): string {
  if (!isLength(cm)) return NO_MEASURE;
  const quarters = Math.round(cmToIn(cm) * 4);
  const whole = Math.floor(quarters / 4);
  return `${whole}${QUARTERS[quarters % 4]} in`;
}

/** Display only. Rounds to the nearest half centimetre, e.g. 84.5 cm. Returns NO_MEASURE for NaN, infinite or negative input. */
export function formatCm(cm: number): string {
  if (!isLength(cm)) return NO_MEASURE;
  const half = Math.round(cm * 2) / 2;
  return `${Number.isInteger(half) ? half : half.toFixed(1)} cm`;
}
