import type { Measures } from "./measures.ts";
import { CM_PER_IN, round1 } from "./units.ts";
import { FIT_EASE, type FitId } from "./fit-preference.ts";

// Ported from app.js SIZE_CHART (L147-152). Inches.
export const SIZE_CHART = [
  { size: "S",  bustMin: 34, bustMax: 36, waistMin: 26, waistMax: 28, hipMin: 36, hipMax: 38 },
  { size: "M",  bustMin: 36, bustMax: 38, waistMin: 28, waistMax: 30, hipMin: 38, hipMax: 40 },
  { size: "L",  bustMin: 38, bustMax: 40, waistMin: 30, waistMax: 32, hipMin: 40, hipMax: 42 },
  { size: "XL", bustMin: 40, bustMax: 42, waistMin: 32, waistMax: 34, hipMin: 42, hipMax: 44 },
] as const;
export type Band = (typeof SIZE_CHART)[number];
export type ReadySize = Band["size"];
export type ReasonCode = "bust-outside-band" | "hip-over" | "waist-over" | "bust-over" | "below-chart" | "relaxed-room" | "fitted-little-ease" | "fitted-near-top";

export interface SizeAdvice { size: ReadySize | "Custom"; closest: ReadySize; mtm: boolean; reasons: ReasonCode[]; bustIn: number; waistIn: number; hipIn: number; easeCm: number; hipOver: number; waistOver: number; bustOver: number }

const overIn = (v: number, max: number) => (v <= max ? 0 : round1(v - max));
const underIn = (v: number, min: number) => (v >= min ? 0 : round1(min - v));

// Ported from app.js recommendSize (L595-726).
export function recommendSize(m: Measures, fit: FitId): SizeAdvice {
  const ease = FIT_EASE[fit] ?? 0;
  const bustIn = (m.bust + ease) / CM_PER_IN, waistIn = (m.waist + ease) / CM_PER_IN, hipIn = (m.hip + ease) / CM_PER_IN;
  const scored = SIZE_CHART.map(band => {
    const score = Math.abs(bustIn - (band.bustMin + band.bustMax) / 2) + Math.abs(waistIn - (band.waistMin + band.waistMax) / 2) * 0.85 + Math.abs(hipIn - (band.hipMin + band.hipMax) / 2) * 0.9;
    let ok = 0;
    if (bustIn >= band.bustMin - 0.15 && bustIn <= band.bustMax + 0.15) ok++;
    if (waistIn >= band.waistMin - 0.2 && waistIn <= band.waistMax + 0.2) ok++;
    if (hipIn >= band.hipMin - 0.2 && hipIn <= band.hipMax + 0.2) ok++;
    return { band, score, ok };
  }).sort((a, b) => a.score - b.score || b.ok - a.ok);
  const band = scored[0].band;
  const reasons: ReasonCode[] = [];
  let size: ReadySize | "Custom" = band.size, mtm = false;
  const custom = bustIn < SIZE_CHART[0].bustMin - 0.2 || bustIn > SIZE_CHART[3].bustMax + 0.2;
  if (custom) { size = "Custom"; mtm = true; reasons.push("bust-outside-band"); }
  const hipOver = overIn(hipIn, band.hipMax), waistOver = overIn(waistIn, band.waistMax), bustOver = overIn(bustIn, band.bustMax);
  if (hipOver >= 0.8) { mtm = true; reasons.push("hip-over"); }
  if (waistOver >= 0.8) { mtm = true; reasons.push("waist-over"); }
  if (bustOver >= 0.8 && !custom) { mtm = true; reasons.push("bust-over"); }
  if (underIn(hipIn, band.hipMin) >= 1.2 || underIn(waistIn, band.waistMin) >= 1.2) reasons.push("below-chart");
  if (fit === "relaxed" && !custom && !mtm) reasons.push("relaxed-room");
  if (fit === "fitted" && !custom) { reasons.push("fitted-little-ease"); if (bustIn > band.bustMax - 0.4) { mtm = true; reasons.push("fitted-near-top"); } }
  return { size, closest: band.size, mtm: mtm || custom, reasons, bustIn, waistIn, hipIn, easeCm: ease, hipOver, waistOver, bustOver };
}

/** Customer copy. No dashes. */
export function sizeAdviceLine(a: SizeAdvice): string {
  const because: string[] = [];
  if (a.reasons.includes("bust-outside-band")) because.push("the bust is outside our S to XL ready band");
  if (a.reasons.includes("hip-over")) because.push(`the hip needs ${a.hipOver} in more than the ${a.closest} chart`);
  if (a.reasons.includes("waist-over")) because.push(`the waist needs ${a.waistOver} in more than the ${a.closest} chart`);
  if (a.reasons.includes("bust-over")) because.push(`the bust needs ${a.bustOver} in more than the ${a.closest} chart`);
  if (a.reasons.includes("fitted-near-top")) because.push("a fitted cut sits near the top of the bust band");
  if (a.mtm) return `Your closest Gulmohar size is ${a.closest}. We recommend made to measure${because.length ? " because " + because.join(" and ") : ""}.`;
  return `Your closest Gulmohar size is ${a.closest}. Ready stock is possible.`;
}
