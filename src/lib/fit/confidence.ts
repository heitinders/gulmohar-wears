import { FIELDS, GIRTH_KEYS, LM, type Field, type Landmarks, type Measures, type Source } from "./measures.ts";
import type { PoseQuality } from "./retake.ts";
import { getStyle, type StyleId } from "./styles.ts";

// Ported from app.js computeConfidence fieldMeta (L975-991): landmarks averaged per field, plus the side-photo boost.
const META: Record<Field, { idx: number[]; sideBoost: number }> = {
  bust: { idx: [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP], sideBoost: 12 },
  waist: { idx: [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP], sideBoost: 12 },
  hip: { idx: [LM.L_HIP, LM.R_HIP], sideBoost: 10 },
  shoulder: { idx: [LM.L_SHOULDER, LM.R_SHOULDER], sideBoost: 0 },
  acrossBack: { idx: [LM.L_SHOULDER, LM.R_SHOULDER], sideBoost: 0 },
  armhole: { idx: [LM.L_SHOULDER, LM.L_ELBOW], sideBoost: 0 },
  sleeve: { idx: [LM.L_WRIST, LM.R_WRIST, LM.L_SHOULDER], sideBoost: 0 },
  kameez: { idx: [LM.L_SHOULDER, LM.L_HIP, LM.L_KNEE], sideBoost: 0 },
  neck: { idx: [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER], sideBoost: 0 },
  salwar: { idx: [LM.L_HIP, LM.L_ANKLE, LM.R_ANKLE], sideBoost: 0 },
  thigh: { idx: [LM.L_HIP, LM.L_KNEE], sideBoost: 6 },
  knee: { idx: [LM.L_KNEE, LM.R_KNEE], sideBoost: 0 },
  ankle: { idx: [LM.L_ANKLE, LM.R_ANKLE], sideBoost: 0 },
};

// Ported from app.js lmVis (L438-444): visibility, else presence, else 1; 0 when missing.
const vis = (lm: Landmarks, i: number) => {
  const p = lm[i];
  if (!p) return 0;
  return p.visibility ?? p.presence ?? 1;
};

// Ported from app.js computeConfidence (L972-1015). Unlike the prototype, callers re-run this after calibration.
export function computeConfidence(
  m: Measures,
  front: Landmarks | null,
  side: Landmarks | null,
  quality: PoseQuality | null,
  calibrated: boolean,
): Record<Field, number> {
  const hasSide = !!(side && m.mode === "landmarks");
  const penalty = quality?.hard ? 18 : quality?.issues.length ? 8 : 0;
  const out = {} as Record<Field, number>;
  for (const key of FIELDS) {
    const meta = META[key];
    const v = front ? meta.idx.reduce((s, i) => s + vis(front, i), 0) / meta.idx.length : 0.3;
    let c = 42 + v * 38;
    const src = m.sources[key] || "ratio";
    if (src === "ratio" || m.mode === "ratio") c = Math.min(c, 55);
    if (src === "ratio-clamped") c -= 14;
    if (src === "landmark") c += 6;
    if (src === "landmark+side") c += 10;
    if (hasSide) c += meta.sideBoost;
    if (calibrated && GIRTH_KEYS.includes(key)) c = Math.min(96, c + 18);
    if (calibrated && src === "calibrated") c = Math.min(97, Math.max(c, 90));
    c -= penalty;
    if (!front) c = Math.min(c, 48);
    out[key] = Math.max(25, Math.min(97, Math.round(c)));
  }
  return out;
}

// Ported from app.js confidenceClass (L1017-1021): 85 and up high, 70 and up mid.
export const confidenceLevel = (pct: number): "high" | "mid" | "low" => (pct >= 85 ? "high" : pct >= 70 ? "mid" : "low");

const HEIGHT_FLOOR_FIELDS: Field[] = ["neck", "armhole", "knee", "ankle"]; // Decisions 1

/** Customer-facing word for where a number came from. */
export function sourceLabel(source: Source, field: Field, styleId: StyleId): string {
  if (source === "calibrated") return "your tape";
  if (source === "tailor-verified") return "tailor verified";
  if (source === "saved-profile") return "saved";
  if (source === "ratio" || source === "ratio-clamped") return "from height";
  if (HEIGHT_FLOOR_FIELDS.includes(field)) return "from height";
  if (field === "kameez" && getStyle(styleId).kameezRatio > 0.46) return "from height"; // Decisions 2
  if (field === "salwar") return "from height"; // the height floor always wins in the prototype
  return source === "landmark+side" ? "photo and side" : "from photo";
}
