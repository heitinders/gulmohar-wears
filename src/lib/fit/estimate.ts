import { FIELDS, LM, RATIOS, type Field, type Landmarks, type Measures, type ScaleMethod, type Source, type Values } from "./measures.ts";
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

// Ported from app.js DEPTH_K_FRONT, CLAMP_LO, CLAMP_HI (L434-436).
const DEPTH_K_FRONT = 0.95, CLAMP_LO = 0.85, CLAMP_HI = 1.15;

type Point = { x: number; y: number };

// Ported from app.js lmVis (L438-444): visibility, else presence, else 1; 0 when missing.
const lmVis = (lm: Landmarks, i: number) => { const p = lm[i]; if (!p) return 0; return p.visibility ?? p.presence ?? 1; };
// Ported from app.js lmDist, mid, lerpPt (L412-428).
const lmDist = (lm: Landmarks, a: number, b: number, w: number, h: number) => Math.hypot((lm[a].x - lm[b].x) * w, (lm[a].y - lm[b].y) * h);
const mid = (lm: Landmarks, a: number, b: number): Point => ({ x: (lm[a].x + lm[b].x) / 2, y: (lm[a].y + lm[b].y) / 2 });
const lerpPt = (p: Point, q: Point, t: number): Point => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

// Ported from app.js cmPerPxFromHeight (L453-504).
export function cmPerPxFromHeight(lm: Landmarks, imgW: number, imgH: number, heightCm: number): { cmPerPx: number | null; method: ScaleMethod; warning: string | null } {
  const noseY = lm[LM.NOSE].y;
  const ankleY = Math.max(lm[LM.L_ANKLE].y, lm[LM.R_ANKLE].y);
  const heelY = Math.max(lm[LM.L_HEEL]?.y ?? 0, lm[LM.R_HEEL]?.y ?? 0);
  const footY = Math.max(lm[LM.L_FOOT]?.y ?? 0, lm[LM.R_FOOT]?.y ?? 0);
  const bottomY = Math.max(ankleY, heelY, footY);
  const ankleVis = Math.min(lmVis(lm, LM.L_ANKLE), lmVis(lm, LM.R_ANKLE));
  const heelVis = Math.min(lmVis(lm, LM.L_HEEL), lmVis(lm, LM.R_HEEL));
  const footVis = Math.min(lmVis(lm, LM.L_FOOT), lmVis(lm, LM.R_FOOT));
  const feetVis = Math.max(ankleVis, heelVis, footVis);
  const feetOk = bottomY >= 0.88 && feetVis >= 0.45 && bottomY <= 0.995;
  if (feetOk) {
    const spanPx = Math.abs(bottomY - noseY) * imgH;
    if (spanPx >= 10) return { cmPerPx: (heightCm * 0.93) / spanPx, method: "nose-heel", warning: null };
  }
  const hipMid = mid(lm, LM.L_HIP, LM.R_HIP);
  const torsoPx = Math.abs(hipMid.y - noseY) * imgH;
  if (torsoPx >= 10) return { cmPerPx: (heightCm * 0.36) / torsoPx, method: "nose-hip-fallback", warning: "Feet look cropped or unclear, scaled from torso vs height. Retake with full feet in frame." };
  const shoulderPx = lmDist(lm, LM.L_SHOULDER, LM.R_SHOULDER, imgW, imgH);
  if (shoulderPx >= 5) return { cmPerPx: (heightCm * RATIOS.shoulder) / shoulderPx, method: "shoulder-fallback", warning: "Could not use full-body scale, using shoulder vs height. Retake full-body with feet visible." };
  return { cmPerPx: null, method: "none", warning: "Could not derive scale from pose." };
}

// Ported from app.js girthCircumference (L515-525).
export function girthCircumference(frontFullWidth: number, depthFull: number | null = null, depthK = DEPTH_K_FRONT): number {
  const F = Math.max(frontFullWidth, 0);
  if (!F) return 0;
  if (depthFull != null && depthFull > 0) { const a = F / 2, b = depthFull / 2; return 2 * Math.PI * Math.sqrt((a * a + b * b) / 2); }
  const k = Math.min(1.05, Math.max(0.92, depthK));
  return F * Math.PI * k;
}

export interface PoseImage { lm: Landmarks; w: number; h: number }

// Ported from app.js landmarkMeasures (L728-862).
export function landmarkMeasures(input: { front: PoseImage; side?: PoseImage | null; heightCm: number; kameezOverrideCm: number | null; styleId: StyleId }): Measures {
  const { front, side, heightCm, kameezOverrideCm, styleId } = input;
  const style = getStyle(styleId);
  const base = ratioMeasures(heightCm, kameezOverrideCm, styleId);
  const warnings: string[] = [];
  const f = front.lm, fw = front.w, fh = front.h;
  const scale = cmPerPxFromHeight(f, fw, fh, heightCm);
  if (scale.warning) warnings.push(scale.warning);
  if (!scale.cmPerPx) return { ...base, mode: "ratio", scaleMethod: "none", warnings };
  const cmPerPx = scale.cmPerPx;
  const widthCm = (a: number, b: number) => lmDist(f, a, b, fw, fh) * cmPerPx;   // horizWidthCm (L506)

  const shoulder = widthCm(LM.L_SHOULDER, LM.R_SHOULDER);
  const acrossBack = shoulder * 0.88;
  const lineW = (t: number) => { const l = lerpPt(f[LM.L_SHOULDER], f[LM.L_HIP], t), r = lerpPt(f[LM.R_SHOULDER], f[LM.R_HIP], t); return Math.hypot((l.x - r.x) * fw, (l.y - r.y) * fh) * cmPerPx; };
  const bustFrontW = lineW(0.22), waistFrontW = lineW(0.48);
  const hipFrontW = widthCm(LM.L_HIP, LM.R_HIP);

  let bustDepth: number | null = null, waistDepth: number | null = null, hipDepth: number | null = null, usedSide = false;
  if (side) {
    const sideScale = cmPerPxFromHeight(side.lm, side.w, side.h, heightCm);
    const sideCm = sideScale.cmPerPx || cmPerPx;
    if (sideScale.warning) warnings.push("Side: " + sideScale.warning);
    const xs = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP].map(i => side.lm[i].x);
    const torsoDepthCm = (Math.max(...xs) - Math.min(...xs)) * side.w * sideCm;
    const depthClamped = Math.min(heightCm * 0.22, Math.max(heightCm * 0.10, torsoDepthCm));
    if (torsoDepthCm < heightCm * 0.08 || torsoDepthCm > heightCm * 0.28) warnings.push("Side depth looked extreme, clamped to body norms.");
    bustDepth = depthClamped * 1.05; waistDepth = depthClamped * 0.92; hipDepth = depthClamped * 1.08; usedSide = true;
  }

  const sleeve = ((lmDist(f, LM.L_SHOULDER, LM.L_WRIST, fw, fh) + lmDist(f, LM.R_SHOULDER, LM.R_WRIST, fw, fh)) * cmPerPx) / 2;
  const upperArm = lmDist(f, LM.L_SHOULDER, LM.L_ELBOW, fw, fh) * cmPerPx * 0.22;
  const armhole = Math.max(upperArm * 2 * Math.PI * 0.55, heightCm * 0.22);
  const shoulderMid = mid(f, LM.L_SHOULDER, LM.R_SHOULDER), hipMid = mid(f, LM.L_HIP, LM.R_HIP), kneeMid = mid(f, LM.L_KNEE, LM.R_KNEE), ankleMid = mid(f, LM.L_ANKLE, LM.R_ANKLE);
  const midThigh = lerpPt(hipMid, kneeMid, 0.45);
  let kameez = Math.hypot((shoulderMid.x - midThigh.x) * fw, (shoulderMid.y - midThigh.y) * fh) * cmPerPx;
  if (kameezOverrideCm) kameez = kameezOverrideCm; else if (style.kameezRatio > 0.46) kameez = heightCm * style.kameezRatio;
  const neck = Math.max(shoulder * 0.38 * Math.PI * 0.55, heightCm * 0.18);
  const salwarRaw = Math.hypot((hipMid.x - ankleMid.x) * fw, (hipMid.y - ankleMid.y) * fh) * cmPerPx - 2;
  const salwar = Math.max(salwarRaw, heightCm * ((style.salwarRatio || 0.6) - 0.02));
  const thigh = girthCircumference(hipFrontW * 0.48, usedSide ? hipDepth! * 0.7 : null);
  const kneeW = widthCm(LM.L_KNEE, LM.R_KNEE);
  const knee = Math.max(heightCm * RATIOS.knee * 0.5 + kneeW * 0.15, heightCm * 0.18);
  const ankleW = widthCm(LM.L_ANKLE, LM.R_ANKLE);
  const ankle = Math.max(heightCm * 0.12, (ankleW / 2) * 0.55 * Math.PI);

  const raw: Values = {
    bust: girthCircumference(bustFrontW, bustDepth), waist: girthCircumference(waistFrontW, waistDepth), hip: girthCircumference(hipFrontW, hipDepth),
    shoulder, acrossBack, armhole, sleeve, kameez, neck, salwar, thigh, knee, ankle,
  };
  const out: Measures = { ...base, warnings, mode: usedSide ? "landmarks" : "hybrid", scaleMethod: scale.method, sources: { ...base.sources } };
  // Sanity clamp, ported from L848-860. Like app.js, the rounded value is compared against the ratio band.
  for (const k of FIELDS) {
    const r = base[k], v = round1(raw[k]);
    if (!Number.isFinite(v) || v < r * CLAMP_LO || v > r * CLAMP_HI) { out[k] = r; out.sources[k] = "ratio-clamped"; }
    else { out[k] = v; out.sources[k] = usedSide ? "landmark+side" : "landmark"; }
  }
  return out;
}
