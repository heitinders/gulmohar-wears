import type { StorageLike } from "./device-store.ts";
import type { Field, Values } from "./measures.ts";
import type { StyleId } from "./styles.ts";
import type { FitId } from "./fit-preference.ts";

/** Measurements the studio holds for a client on this device only (spec 4.2). Never sent to Supabase. */
export const STUDIO_KEY = "gulmohar_studio_measures_v1";

export interface TailorRecord { values: Partial<Values>; verified: Field[]; at: string }
export interface StudioEntry {
  phone: string; name: string; styleId: StyleId; heightCm: number; fit: FitId; measures: Values;
  confidence: Partial<Record<Field, number>>; source: "studio-fit" | "import"; savedAt: string; tailor?: TailorRecord;
}
export type StudioEntryInput = Omit<StudioEntry, "savedAt" | "tailor">;

export function createStudioStore(storage: StorageLike | null) {
  const read = (): StudioEntry[] => { try { const raw = storage?.getItem(STUDIO_KEY); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; } };
  const write = (list: StudioEntry[]) => { try { if (!storage) return false; storage.setItem(STUDIO_KEY, JSON.stringify(list)); return true; } catch { return false; } };
  return {
    list: read,
    get: (phone: string) => read().find(e => e.phone === phone) ?? null,
    save(input: StudioEntryInput) {
      const list = read(); const old = list.find(e => e.phone === input.phone);
      const entry: StudioEntry = { ...input, savedAt: new Date().toISOString(), ...(old?.tailor ? { tailor: old.tailor } : {}) };
      return write([entry, ...list.filter(e => e.phone !== input.phone)]);
    },
    attachTailor(phone: string, values: Partial<Values>, verified: Field[]) {
      const list = read(); const e = list.find(x => x.phone === phone); if (!e) return false;
      e.tailor = { values, verified, at: new Date().toISOString() };
      return write(list);
    },
    remove(phone: string) { const list = read(); if (!list.some(e => e.phone === phone)) return false; return write(list.filter(e => e.phone !== phone)); },
  };
}
export type StudioStore = ReturnType<typeof createStudioStore>;

export function browserStudioStore(): StudioStore {
  try { return createStudioStore(typeof window === "undefined" ? null : window.localStorage); } catch { return createStudioStore(null); }
}
