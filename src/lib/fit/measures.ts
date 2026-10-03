// Ported from app.js VERIFY_FIELDS (L47-61), keys only and in the same order.
export const FIELDS = ["bust", "waist", "hip", "shoulder", "acrossBack", "armhole", "sleeve", "kameez", "neck", "salwar", "thigh", "knee", "ankle"] as const;
export type Field = (typeof FIELDS)[number];

// Ported from app.js GIRTH_KEYS (L431).
export const GIRTH_KEYS: Field[] = ["bust", "waist", "hip", "neck", "armhole", "thigh", "knee", "ankle"];

export type Source = "ratio" | "ratio-clamped" | "landmark" | "landmark+side" | "calibrated" | "tailor-verified" | "saved-profile";
export type Mode = "none" | "landmarks" | "hybrid" | "ratio";
export type ScaleMethod = "nose-heel" | "nose-hip-fallback" | "shoulder-fallback" | "none";

export type Values = Record<Field, number>;

export interface Measures extends Values {
  sources: Record<Field, Source>;
  mode: Mode;
  scaleMethod: ScaleMethod;
  warnings: string[];
  calibrated?: boolean;
}

export interface Landmark { x: number; y: number; z?: number; visibility?: number; presence?: number }
export type Landmarks = Landmark[];

// Ported from app.js LM (L155-173).
export const LM = {
  NOSE: 0, L_SHOULDER: 11, R_SHOULDER: 12, L_ELBOW: 13, R_ELBOW: 14, L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANKLE: 27, R_ANKLE: 28, L_HEEL: 29, R_HEEL: 30, L_FOOT: 31, R_FOOT: 32,
} as const;

// Ported from app.js RATIOS (L176-190).
export const RATIOS: Values = {
  bust: 0.515, waist: 0.40, hip: 0.54, shoulder: 0.229, acrossBack: 0.20, armhole: 0.24, sleeve: 0.31,
  kameez: 0.45, neck: 0.205, salwar: 0.60, thigh: 0.34, knee: 0.22, ankle: 0.14,
};
