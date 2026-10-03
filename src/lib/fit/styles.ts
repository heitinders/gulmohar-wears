import type { Field } from "./measures.ts";

// Ported from app.js STYLES (L71-144). Ratios are fractions of height.
export type StyleId = "punjabi" | "anarkali" | "sharara" | "farshi";

export interface Style {
  id: StyleId;
  label: string;
  note: string;             // one line under the card name (customer copy, written here)
  kameezRatio: number;
  salwarRatio: number;
  kameezLabel: string;      // waKameezLen in the prototype
  bottomTitle: string;      // waBottomTitle in the prototype
  bottomRows: { key: Field; label: string }[];
}

export const STYLES: Style[] = [
  {
    id: "punjabi", label: "Classic Punjabi suit", note: "Kameez to mid thigh, salwar below",
    kameezRatio: 0.45, salwarRatio: 0.60, kameezLabel: "Kameez length", bottomTitle: "Bottom (salwar)",
    bottomRows: [
      { key: "salwar", label: "Salwar length" }, { key: "thigh", label: "Thigh" },
      { key: "knee", label: "Knee" }, { key: "ankle", label: "Bottom / ankle opening" },
    ],
  },
  {
    id: "anarkali", label: "Anarkali", note: "Long flared kameez, churidar under",
    kameezRatio: 0.58, salwarRatio: 0.58, kameezLabel: "Anarkali length", bottomTitle: "Bottom (under Anarkali)",
    bottomRows: [
      { key: "salwar", label: "Churidar / salwar length" }, { key: "thigh", label: "Thigh" },
      { key: "knee", label: "Knee" }, { key: "ankle", label: "Ankle / churidar opening" },
    ],
  },
  {
    id: "sharara", label: "Sharara", note: "Short kameez, wide flared bottom",
    kameezRatio: 0.48, salwarRatio: 0.62, kameezLabel: "Kameez length (sharara set)", bottomTitle: "Bottom (sharara)",
    bottomRows: [
      { key: "salwar", label: "Sharara length" }, { key: "thigh", label: "Thigh (flare start)" },
      { key: "knee", label: "Knee" }, { key: "ankle", label: "Flare / bottom opening" },
    ],
  },
  {
    id: "farshi", label: "Farshi", note: "Floor length, trailing bottom",
    kameezRatio: 0.52, salwarRatio: 0.66, kameezLabel: "Kurti / kameez length (farshi)", bottomTitle: "Bottom (farshi)",
    bottomRows: [
      { key: "salwar", label: "Farshi length (near floor)" }, { key: "thigh", label: "Thigh" },
      { key: "knee", label: "Knee" }, { key: "ankle", label: "Farshi / floor opening" },
    ],
  },
];

export const getStyle = (id: StyleId): Style => STYLES.find(s => s.id === id) ?? STYLES[0];
