import { FIELDS, RATIOS, type Field, type Measures, type Source } from "./measures.ts";
import { round1 } from "./units.ts";
import { getStyle, type StyleId } from "./styles.ts";

const allSources = (s: Source) => Object.fromEntries(FIELDS.map(f => [f, s])) as Record<Field, Source>;

// Ported from app.js ratioMeasures (L556-581).
export function ratioMeasures(heightCm: number, kameezOverrideCm: number | null, styleId: StyleId): Measures {
  const style = getStyle(styleId);
  const out = {} as Measures;
  for (const f of FIELDS) out[f] = round1(heightCm * RATIOS[f]);
  out.kameez = round1(kameezOverrideCm || heightCm * style.kameezRatio);
  out.salwar = round1(Math.max(0, heightCm * style.salwarRatio - 2)); // 2 cm hem ease
  out.sources = allSources("ratio");
  out.mode = "ratio";
  out.scaleMethod = "none";
  out.warnings = [];
  return out;
}
