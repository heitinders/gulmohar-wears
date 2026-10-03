import { LM, type Landmarks } from "./measures.ts";

type Spec = Partial<Record<keyof typeof LM, [x: number, y: number, visibility?: number]>>;

/** 33 landmarks, all (0.5, 0.5, vis 1) unless listed. Coordinates are normalised like MediaPipe. */
export function makeLandmarks(spec: Spec): Landmarks {
  const lm: Landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  for (const [name, [x, y, visibility = 1]] of Object.entries(spec) as [keyof typeof LM, [number, number, number?]][]) {
    lm[LM[name]] = { x, y, visibility };
  }
  return lm;
}

/** A clean, upright, full-body front pose in a 1000 by 2000 image. Height 64 in. */
export const FRONT = makeLandmarks({
  NOSE: [0.5, 0.10],
  L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25],
  L_ELBOW: [0.25, 0.40], R_ELBOW: [0.75, 0.40],
  L_WRIST: [0.22, 0.55], R_WRIST: [0.78, 0.55],
  L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55],
  L_KNEE: [0.40, 0.75], R_KNEE: [0.60, 0.75],
  L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93],
  L_HEEL: [0.42, 0.95], R_HEEL: [0.58, 0.95],
  L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95],
});

/** A clean profile with a 0.20 torso depth span. */
export const SIDE = makeLandmarks({
  NOSE: [0.62, 0.10],
  L_SHOULDER: [0.50, 0.25], R_SHOULDER: [0.52, 0.25],
  L_HIP: [0.44, 0.55], R_HIP: [0.42, 0.55],
  L_ANKLE: [0.48, 0.93], R_ANKLE: [0.48, 0.93],
  L_HEEL: [0.48, 0.95], R_HEEL: [0.48, 0.95],
  L_FOOT: [0.48, 0.95], R_FOOT: [0.48, 0.95],
});

export const IMG = { w: 1000, h: 2000 };
export const HEIGHT_64_IN = 162.56;
