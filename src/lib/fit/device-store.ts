import type { Field, Measures } from "./measures.ts";
import type { StyleId } from "./styles.ts";
import type { FitPreference } from "./fit-preference.ts";
import type { Calibration } from "./calibrate.ts";
import type { OrderBrief } from "../enquiries/messages.ts";

export const PROFILE_KEY = "gulmohar_fit_profile_v1";
export const MAX_PROFILES = 10;
export const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000; // Ported from app.js SIX_MONTHS_MS (L29)

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export interface SavedProfile {
  id: string; name: string; styleId: StyleId; heightCm: number; kameezOverrideCm: number | null; preference: FitPreference;
  measures: Measures; rawMeasures: Measures | null; calibration: Calibration | null; confidence: Record<Field, number>; brief: OrderBrief | null; savedAt: string;
}
export type ProfileInput = Omit<SavedProfile, "id" | "savedAt"> & { id?: string };

const newId = () => `fit_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Every storage access is wrapped: private mode, full quota or a missing window must never break the flow. */
export function createProfileStore(storage: StorageLike | null) {
  const read = (): SavedProfile[] => {
    try { const raw = storage?.getItem(PROFILE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };
  const write = (list: SavedProfile[]) => { try { storage?.setItem(PROFILE_KEY, JSON.stringify(list)); return !!storage; } catch { return false; } };
  return {
    list: read,
    save(input: ProfileInput): { ok: boolean; profile?: SavedProfile } {
      const list = read();
      const existing = input.id ? list.find(p => p.id === input.id) : undefined;
      const profile: SavedProfile = { ...input, id: existing?.id ?? newId(), savedAt: new Date().toISOString() };
      const next = [profile, ...list.filter(p => p.id !== profile.id)].slice(0, MAX_PROFILES);
      return write(next) ? { ok: true, profile } : { ok: false };
    },
    remove(id: string) { const list = read(); if (!list.some(p => p.id === id)) return false; return write(list.filter(p => p.id !== id)); },
    clear() { try { if (!storage) return false; storage.removeItem(PROFILE_KEY); return true; } catch { return false; } },
    // Ported from app.js isMeasuresStale (L1221-1224)
    isStale(p: SavedProfile, now = new Date()) { return now.getTime() - Date.parse(p.savedAt) > SIX_MONTHS_MS; },
  };
}
export type ProfileStore = ReturnType<typeof createProfileStore>;

export function browserProfileStore(): ProfileStore {
  try { return createProfileStore(typeof window === "undefined" ? null : window.localStorage); } catch { return createProfileStore(null); }
}
