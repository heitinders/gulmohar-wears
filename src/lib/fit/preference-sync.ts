import { STYLES, type StyleId } from "./styles.ts";
import { FIT_LABELS, NECKLINE_LABELS, SLEEVE_LABELS, type FitId, type NecklineId, type SleeveId } from "./fit-preference.ts";

/** The only order-brief fields the database accepts (spec 4.3). Notes stay on the phone and in WhatsApp. */
export interface BriefRow { occasion?: string; fabric?: string; city?: string; deadline?: string }
/** Everything a customer may sync to the studio. No measurements, height, weight, age or images, ever. */
export interface PreferencePatch { style?: StyleId; fit?: FitId; sleeve?: SleeveId; neckline?: NecklineId; lengthNote?: string; brief?: BriefRow | null }

const BRIEF_KEYS = ["occasion", "fabric", "city"] as const;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "");
const realDate = (v: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const d = new Date(`${v}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v); };
const oneOf = <T extends string>(v: unknown, allowed: readonly string[]): T | undefined => (typeof v === "string" && allowed.includes(v) ? (v as T) : undefined);

function toBrief(v: unknown): BriefRow | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>; const out: BriefRow = {};
  for (const k of BRIEF_KEYS) { const t = text(o[k], 120); if (t) out[k] = t; }
  const d = text(o.deadline, 10); if (d && realDate(d)) out.deadline = d;
  return Object.keys(out).length ? out : null;
}

/** Whitelists and trims whatever the browser sent. Unknown keys and out-of-list values are dropped, never stored. */
export function toPreferencePatch(input: unknown): PreferencePatch {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const o = input as Record<string, unknown>; const out: PreferencePatch = {};
  const style = oneOf<StyleId>(o.style, STYLES.map(s => s.id)); if (style) out.style = style;
  const fit = oneOf<FitId>(o.fit, Object.keys(FIT_LABELS)); if (fit) out.fit = fit;
  const sleeve = oneOf<SleeveId>(o.sleeve, Object.keys(SLEEVE_LABELS)); if (sleeve) out.sleeve = sleeve;
  const neckline = oneOf<NecklineId>(o.neckline, Object.keys(NECKLINE_LABELS)); if (neckline) out.neckline = neckline;
  if (typeof o.lengthNote === "string") out.lengthNote = text(o.lengthNote, 200);
  if ("brief" in o) out.brief = toBrief(o.brief);
  return out;
}
