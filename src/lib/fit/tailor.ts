import { CM_PER_IN } from "./units.ts";

export const TAPE_MIN_IN = 4;
export const TAPE_MAX_IN = 80;

/** A tailor's tape value, typed in inches. Blank is "no correction". */
export function parseTapeInches(text: string): { ok: true; cm: number | null } | { ok: false } {
  const t = text.trim().replace(",", ".");
  if (!t) return { ok: true, cm: null };
  if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false };
  const inches = Number(t);
  if (inches < TAPE_MIN_IN || inches > TAPE_MAX_IN) return { ok: false };
  return { ok: true, cm: Math.round(inches * CM_PER_IN * 100) / 100 };
}

/** Back to the inches a tailor typed, to the nearest quarter. */
export const inchesText = (cm: number) => String(Math.round((cm / CM_PER_IN) * 4) / 4);
