// Ported from app.js FIT_LABELS, SLEEVE_LABELS, NECKLINE_LABELS, FIT_EASE (L31-45).
export type FitId = "fitted" | "regular" | "relaxed";
export type SleeveId = "full" | "three-quarter" | "cap" | "sleeveless";
export type NecklineId = "round" | "v" | "boat" | "collar";

export const FIT_EASE: Record<FitId, number> = { fitted: -1.0, regular: 0, relaxed: 2.5 }; // cm
export const FIT_LABELS: Record<FitId, string> = { fitted: "Fitted", regular: "Regular", relaxed: "Relaxed" };
export const SLEEVE_LABELS: Record<SleeveId, string> = { full: "Full sleeve", "three-quarter": "Three-quarter sleeve", cap: "Cap sleeve", sleeveless: "Sleeveless" };
export const NECKLINE_LABELS: Record<NecklineId, string> = { round: "Round", v: "V-neck", boat: "Boat", collar: "Collar" };

export interface FitPreference { fit: FitId; sleeve: SleeveId; neckline: NecklineId; lengthNote: string }
export const defaultPreference: FitPreference = { fit: "regular", sleeve: "full", neckline: "round", lengthNote: "" };
