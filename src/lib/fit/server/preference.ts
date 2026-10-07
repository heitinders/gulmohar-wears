import { toPreferencePatch } from "../preference-sync.ts";
import { verifyClientToken } from "./token.ts";
import type { FitStore } from "./store.ts";

/** The token can only change its own row, and only the whitelisted preference fields (spec 4.4). */
export async function updatePreference(deps: { store: FitStore; secret: string }, token: unknown, patch: unknown): Promise<{ ok: true } | { ok: false; error: "invalid-token" | "unavailable" }> {
  const v = verifyClientToken(token, deps.secret);
  if (!v.ok) return { ok: false, error: "invalid-token" };
  try {
    return (await deps.store.updatePreference(v.clientId, toPreferencePatch(patch))) ? { ok: true } : { ok: false, error: "invalid-token" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
