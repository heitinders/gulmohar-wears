import { FIELDS, type Values } from "./measures.ts";
import { STYLES, type StyleId } from "./styles.ts";
import type { FitId } from "./fit-preference.ts";

export interface DraftPayload { v: 1; style: StyleId; fit: FitId; heightCm: number; calibrated: boolean; m: Values }
export type DecodeResult = { ok: true; payload: DraftPayload } | { ok: false; error: "format" | "checksum" | "schema" };

const PREFIX = "GW1";
const toB64Url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

/** FNV-1a over the body, 4 base36 characters. Catches copy and paste slips; not a security measure. */
function checksum(body: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, "0").slice(-4);
}

export function encodeDraftCode(p: DraftPayload): string {
  const body = toB64Url(JSON.stringify(p));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

export function decodeDraftCode(code: string): DecodeResult {
  const parts = code.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return { ok: false, error: "format" };
  if (checksum(parts[1]) !== parts[2]) return { ok: false, error: "checksum" };
  let p: unknown;
  try { p = JSON.parse(fromB64Url(parts[1])); } catch { return { ok: false, error: "format" }; }
  const o = (p ?? {}) as Partial<DraftPayload>;
  const styleOk = STYLES.some(s => s.id === o.style);
  const fitOk = o.fit === "fitted" || o.fit === "regular" || o.fit === "relaxed";
  const valuesOk = !!o.m && FIELDS.every(f => typeof (o.m as Values)[f] === "number" && Number.isFinite((o.m as Values)[f]));
  if (o.v !== 1 || !styleOk || !fitOk || typeof o.heightCm !== "number" || typeof o.calibrated !== "boolean" || !valuesOk) return { ok: false, error: "schema" };
  return { ok: true, payload: { v: 1, style: o.style!, fit: o.fit!, heightCm: o.heightCm, calibrated: o.calibrated, m: o.m as Values } };
}
