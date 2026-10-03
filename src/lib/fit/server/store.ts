import { randomUUID } from "node:crypto";
import type { StyleId } from "../styles.ts";
import type { FitId } from "../fit-preference.ts";
import type { BriefRow, PreferencePatch } from "../preference-sync.ts";

export interface ClientRow {
  id: string; phone: string; name: string; consentAt: string; consentVersion: string;
  style: StyleId | null; fit: FitId | null; sleeve: string | null; neckline: string | null; lengthNote: string | null; brief: BriefRow | null;
  createdAt: string; updatedAt: string;
}
export interface Usage { tryons: number; reports: number }

/** Server-side access with full rights (the Supabase service role). Customer code paths only. */
export interface FitStore {
  upsertClient(i: { phone: string; name: string; consentAt: string; consentVersion: string }): Promise<{ id: string; phone: string }>;
  getClient(id: string): Promise<ClientRow | null>;
  updatePreference(id: string, patch: PreferencePatch): Promise<boolean>;
  getUsage(key: string, day: string): Promise<Usage>;
  bumpUsage(key: string, day: string, field: keyof Usage): Promise<number>;
}

export interface MemoryState { clients: Map<string, ClientRow>; usage: Map<string, Usage> }
export const newMemoryState = (): MemoryState => ({ clients: new Map(), usage: new Map() });

/** Development and test stand-in for Supabase. fitBackend() refuses it in production. */
export function createMemoryStore(now: () => Date = () => new Date(), state: MemoryState = newMemoryState()): FitStore {
  const copy = (r: ClientRow): ClientRow => structuredClone(r);
  return {
    async upsertClient(i) {
      const at = now().toISOString();
      const existing = [...state.clients.values()].find(c => c.phone === i.phone);
      if (existing) { Object.assign(existing, { name: i.name, consentAt: i.consentAt, consentVersion: i.consentVersion, updatedAt: at }); return { id: existing.id, phone: existing.phone }; }
      const row: ClientRow = { id: randomUUID(), phone: i.phone, name: i.name, consentAt: i.consentAt, consentVersion: i.consentVersion, style: null, fit: null, sleeve: null, neckline: null, lengthNote: null, brief: null, createdAt: at, updatedAt: at };
      state.clients.set(row.id, row);
      return { id: row.id, phone: row.phone };
    },
    async getClient(id) { const r = state.clients.get(id); return r ? copy(r) : null; },
    async updatePreference(id, patch) {
      const r = state.clients.get(id); if (!r) return false;
      Object.assign(r, structuredClone(patch), { updatedAt: now().toISOString() });
      return true;
    },
    async getUsage(key, day) { return { ...(state.usage.get(`${key}|${day}`) ?? { tryons: 0, reports: 0 }) }; },
    async bumpUsage(key, day, field) {
      const k = `${key}|${day}`; const u = state.usage.get(k) ?? { tryons: 0, reports: 0 };
      u[field] += 1; state.usage.set(k, u); return u[field];
    },
  };
}
