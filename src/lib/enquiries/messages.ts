import { brand } from "../brand.ts";
import { type Field, type Measures } from "../fit/measures.ts";
import { getStyle, type StyleId } from "../fit/styles.ts";
import { FIT_LABELS, NECKLINE_LABELS, SLEEVE_LABELS, type FitPreference } from "../fit/fit-preference.ts";
import type { Calibration } from "../fit/calibrate.ts";
import { sizeAdviceLine, type SizeAdvice } from "../fit/size-advice.ts";
import { formatCm, formatIn } from "../fit/units.ts";

/** CRM-neutral: no provider fields, credentials or transport in the UI model. */
export interface Enquiry {
  version: 1;
  name: string;
  occasion: string;
  eventDate?: string;
  destination?: string;
  fabric?: string;
  notes?: string;
  productReference?: string;
  source: string;
}

const clean = (value: string) => value.trim().replace(/[\r\n]+/g, " ");

export function composeEnquiry(enquiry: Enquiry): string {
  const lines = [
    `Hi Gulmohar, I’m ${clean(enquiry.name)}. I’d like to discuss an outfit.`,
    `Occasion: ${clean(enquiry.occasion)}`,
  ];
  const details = [
    ["Event date", enquiry.eventDate], ["Deliver to", enquiry.destination],
    ["Fabric preference", enquiry.fabric], ["Piece reference", enquiry.productReference],
    ["Notes", enquiry.notes],
  ];
  for (const [label, value] of details) {
    if (value?.trim()) lines.push(`${label}: ${clean(value)}`);
  }
  lines.push("Please help me with the design, fit, price and delivery timeline.");
  return lines.join("\n");
}

export function whatsappUrl(message = "Hi Gulmohar, I would like to enquire about a custom outfit."): string {
  return `${brand.whatsappBase}?text=${encodeURIComponent(message)}`;
}

export interface OrderBrief { fabric: string; occasion: string; city: string; deadline: string; notes: string }
export interface DraftMessageInput {
  name: string; styleId: StyleId; preference: FitPreference; heightCm: number; measures: Measures;
  confidence: Record<string, number>; calibration: Calibration | null; advice: SizeAdvice; date: Date; code: string;
}

const UPPER_ROWS: [Field, string][] = [["bust", "Bust"], ["waist", "Waist"], ["hip", "Hip"], ["shoulder", "Shoulder"], ["acrossBack", "Across back"], ["armhole", "Armhole"], ["sleeve", "Sleeve length"], ["kameez", "Kameez length"], ["neck", "Neck"]];
const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "short", day: "numeric" });
const both = (cm: number) => `${formatIn(cm)} (${formatCm(cm)})`;

function draftHeader(i: DraftMessageInput, title: string): string[] {
  const style = getStyle(i.styleId);
  const photos = i.measures.mode === "landmarks" ? "front and side" : i.measures.mode === "hybrid" ? "front only" : "height only";
  const p = i.preference;
  return [
    `Gulmohar Wears, ${title}`,
    `Name: ${clean(i.name) || "not given"}`,
    `Style: ${style.label}`,
    `Fit: ${FIT_LABELS[p.fit]}. Sleeve: ${SLEEVE_LABELS[p.sleeve]}. Neckline: ${NECKLINE_LABELS[p.neckline]}.${p.lengthNote ? ` Length note: ${clean(p.lengthNote)}` : ""}`,
    `Height: ${both(i.heightCm)}`,
    `Date: ${formatDate(i.date)}`,
    `Photos: ${photos}`,
    `Size advice: ${sizeAdviceLine(i.advice)}`,
  ];
}

function measureLines(i: DraftMessageInput): string[] {
  const style = getStyle(i.styleId);
  const row = (key: Field, label: string) => `${label}: ${both(i.measures[key])}, draft, confidence ${i.confidence[key] ?? "?"}%`;
  return [
    "", "Kameez and upper",
    ...UPPER_ROWS.map(([k, l]) => row(k, k === "kameez" ? style.kameezLabel : l)),
    "", style.bottomTitle,
    ...style.bottomRows.map(r => row(r.key, r.label.replace(" / ", " or "))),
  ];
}

export function composeMeasurementDraft(i: DraftMessageInput): string {
  const cal = i.calibration
    ? `Calibration: ${i.calibration.field} tape ${formatIn(i.calibration.tapeCm)}, girths scaled to your tape.`
    : "Calibration: none yet. One tape measure of the bust or waist brings the girths much closer.";
  return [
    ...draftHeader(i, "measurement DRAFT"), cal,
    ...measureLines(i),
    "", "All numbers are photo estimates marked DRAFT. Our tailor verifies every measurement before cutting fabric.",
    "Ready stock size is a guide only, not a cut sheet.",
    `Draft code: ${i.code}`,
  ].join("\n");
}

export function composeOrderBrief(i: DraftMessageInput & { brief: OrderBrief }): string {
  const b = i.brief;
  const deadline = b.deadline ? formatDate(new Date(`${b.deadline}T12:00:00+05:30`)) : "not set";
  return [
    ...draftHeader(i, "order brief DRAFT"),
    "", "Order details",
    `Fabric preference: ${clean(b.fabric) || "not set"}`, `Occasion: ${clean(b.occasion) || "not set"}`,
    `Delivery city: ${clean(b.city) || "not set"}`, `Deadline: ${deadline}`, `Notes: ${clean(b.notes) || "none"}`,
    ...measureLines(i),
    "", "All numbers are photo estimates marked DRAFT. Our tailor verifies every measurement before cutting fabric.",
    `Draft code: ${i.code}`,
  ].join("\n");
}
