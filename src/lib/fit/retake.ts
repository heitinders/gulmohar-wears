import { LM, type Landmarks } from "./measures.ts";

export type IssueCode = "no-front" | "too-small" | "feet-cropped" | "head-low" | "arms-blocking" | "shoulders-unclear" | "side-frontal" | "side-feet" | "no-side";
export interface PoseIssue { code: IssueCode; hard: boolean; side: boolean }
export interface PoseQuality { ok: boolean; hard: boolean; issues: PoseIssue[] }

// Ported from app.js lmVis (L438-444): visibility, else presence, else 1; 0 when missing.
const vis = (lm: Landmarks, i: number) => { const p = lm[i]; if (!p) return 0; return p.visibility ?? p.presence ?? 1; };

// Ported from app.js assessPoseQuality (L865-945). Tips became codes; wording lives in the UI.
export function assessPoseQuality(front: Landmarks | null, side: Landmarks | null): PoseQuality {
  const issues: PoseIssue[] = [];
  const push = (code: IssueCode, hard: boolean, isSide = false) => issues.push({ code, hard, side: isSide });
  if (!front) { push("no-front", true); return { ok: false, hard: true, issues }; }

  const nose = front[LM.NOSE], lSho = front[LM.L_SHOULDER], lHip = front[LM.L_HIP], rHip = front[LM.R_HIP];
  const bottomY = Math.max(front[LM.L_ANKLE].y, front[LM.R_ANKLE].y, front[LM.L_FOOT]?.y || 0, front[LM.R_FOOT]?.y || 0);
  const feetVis = Math.max(Math.min(vis(front, LM.L_ANKLE), vis(front, LM.R_ANKLE)), Math.min(vis(front, LM.L_FOOT), vis(front, LM.R_FOOT)));

  if (bottomY - nose.y < 0.55) push("too-small", true);
  if (bottomY < 0.82 || feetVis < 0.4) push("feet-cropped", true);
  if (nose.y > 0.18) push("head-low", false);

  const hipMidX = (lHip.x + rHip.x) / 2;
  const torsoHalf = Math.abs(lHip.x - rHip.x) / 2 || 0.08;
  const blocking = (w: { x: number; y: number }) => Math.abs(w.x - hipMidX) < torsoHalf * 1.15 && w.y > (lSho.y + lHip.y) / 2 && w.y < lHip.y + 0.05;
  if (blocking(front[LM.L_WRIST]) || blocking(front[LM.R_WRIST])) push("arms-blocking", true);
  if (vis(front, LM.L_SHOULDER) < 0.5 || vis(front, LM.R_SHOULDER) < 0.5) push("shoulders-unclear", false);

  if (side) {
    const xs = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP].map(i => side[i].x);
    const depth = Math.max(...xs) - Math.min(...xs);
    const shoulderSpread = Math.abs(side[LM.L_SHOULDER].x - side[LM.R_SHOULDER].x);
    if (shoulderSpread > 0.12 && depth < 0.14) push("side-frontal", true, true);
    else if (shoulderSpread > 0.18) push("side-frontal", true, true);
    if (Math.max(side[LM.L_ANKLE].y, side[LM.R_ANKLE].y) < 0.82) push("side-feet", false, true);
  } else {
    push("no-side", false, true);
  }

  const hard = issues.some(i => i.hard);
  return { ok: !hard, hard, issues };
}
