import { cmToIn, inToCm } from "./units.ts";

export type LengthUnit = "in" | "cm";
/** A typed length: the value in cm, or why there is none. "range" covers numbers out of range and text that is not a number. */
export type LengthInput = { ok: true; cm: number } | { ok: false; reason: "empty" | "range" };

// Ported from app.js #btn-to-front height check (L2724-2730).
export const HEIGHT_MIN_IN = 47;
export const HEIGHT_MAX_IN = 87;
/** Plan range for the optional kameez length. app.js L2732-2733 accepts any positive number. */
export const KAMEEZ_MIN_IN = 20;
export const KAMEEZ_MAX_IN = 63;

function parseLength(raw: string, unit: LengthUnit, minIn: number, maxIn: number): LengthInput {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "empty" };
  const n = Number(text.replace(",", "."));
  const inches = unit === "in" ? n : cmToIn(n);
  if (!Number.isFinite(inches) || inches < minIn || inches > maxIn) return { ok: false, reason: "range" };
  return { ok: true, cm: unit === "in" ? inToCm(n) : n };
}

/** Reads the height field as typed, in either unit. Pure, so it can run on every keystroke. */
export const parseHeight = (raw: string, unit: LengthUnit) => parseLength(raw, unit, HEIGHT_MIN_IN, HEIGHT_MAX_IN);

/** Reads the optional kameez length field, typed in inches. */
export const parseKameezIn = (raw: string) => parseLength(raw, "in", KAMEEZ_MIN_IN, KAMEEZ_MAX_IN);
