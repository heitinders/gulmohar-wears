import type { StorageLike } from "./device-store.ts";
import { toPreferencePatch, type PreferencePatch } from "./preference-sync.ts";

export const TOKEN_KEY = "gulmohar_fit_token_v1";
export const CLIENT_KEY = "gulmohar_fit_client_v1";
export const PENDING_KEY = "gulmohar_fit_pending_pref_v1";

export interface ClientWho { name: string; phoneMasked: string }

/**
 * The gate token on this phone, who it belongs to, and a preference waiting to sync. Never throws. When storage
 * refuses (private browsing, full quota) values live in `fallback` for this visit, so the gate cannot loop.
 */
export function createClientTokenStore(storage: StorageLike | null, fallback: Map<string, string> = new Map()) {
  const get = (k: string) => { try { const v = storage?.getItem(k); if (v != null) return v; } catch { /* use the fallback */ } return fallback.get(k) ?? null; };
  const put = (k: string, v: string) => { try { if (!storage) throw new Error("no storage"); storage.setItem(k, v); fallback.delete(k); return true; } catch { fallback.set(k, v); return false; } };
  const drop = (k: string) => { fallback.delete(k); try { storage?.removeItem(k); } catch { /* nothing to do */ } };
  const json = <T>(k: string, ok: (v: unknown) => v is T): T | null => { try { const raw = get(k); const v = raw ? JSON.parse(raw) : null; return ok(v) ? v : null; } catch { return null; } };
  const isWho = (v: unknown): v is ClientWho => !!v && typeof v === "object" && typeof (v as ClientWho).name === "string" && typeof (v as ClientWho).phoneMasked === "string";
  const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  return {
    get: () => get(TOKEN_KEY),
    who: () => json(CLIENT_KEY, isWho),
    set(token: string, who: ClientWho) { const a = put(TOKEN_KEY, token); const b = put(CLIENT_KEY, JSON.stringify({ name: who.name, phoneMasked: who.phoneMasked })); return a && b; },
    clear() { drop(TOKEN_KEY); drop(CLIENT_KEY); drop(PENDING_KEY); },
    pendingPreference(): PreferencePatch | null { const v = json(PENDING_KEY, isObject); return v ? toPreferencePatch(v) : null; },
    setPendingPreference(p: PreferencePatch) { put(PENDING_KEY, JSON.stringify(toPreferencePatch(p))); },
    clearPending() { drop(PENDING_KEY); },
  };
}
export type ClientTokenStore = ReturnType<typeof createClientTokenStore>;

const visitMemory = new Map<string, string>();
export function browserClientTokenStore(): ClientTokenStore {
  try { return createClientTokenStore(typeof window === "undefined" ? null : window.localStorage, visitMemory); } catch { return createClientTokenStore(null, visitMemory); }
}
