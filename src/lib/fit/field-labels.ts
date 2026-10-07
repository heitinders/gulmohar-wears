import { getStyle, type StyleId } from "./styles.ts";
import type { Field } from "./measures.ts";

const UPPER: [Field, string][] = [["bust", "Bust"], ["waist", "Waist"], ["hip", "Hip"], ["shoulder", "Shoulder"], ["acrossBack", "Across back"], ["armhole", "Armhole"], ["sleeve", "Sleeve length"], ["kameez", "Kameez length"], ["neck", "Neck"]];

/** Field order and names as the customer's ledger shows them, for the given style. */
export function fieldRows(styleId: StyleId): [Field, string][] {
  const style = getStyle(styleId);
  const upper = UPPER.map(([k, l]): [Field, string] => [k, k === "kameez" ? style.kameezLabel : l]);
  const seen = new Set(upper.map(([k]) => k));
  return [...upper, ...style.bottomRows.filter(r => !seen.has(r.key)).map((r): [Field, string] => [r.key, r.label.replace(" / ", " or ")])];
}
