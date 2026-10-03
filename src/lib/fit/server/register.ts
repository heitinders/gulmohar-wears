import { isSupportedCountry } from "libphonenumber-js/min";
import { maskPhone, parsePhone } from "../phone.ts";
import { CONSENT_VERSION } from "../consent.ts";
import { signClientToken, verifyClientToken } from "./token.ts";
import type { FitStore } from "./store.ts";

export interface RegisterDeps { store: FitStore; secret: string; limiter: { take(key: string): boolean }; now: () => Date }
export interface RegisterInput { name: unknown; phone: unknown; country: unknown; consent: unknown; consentVersion: unknown; website: unknown; ip: string }
export type RegisterResult = { ok: true; token: string; phone: string; name: string } | { ok: false; error: "name" | "phone" | "consent" | "rate" | "unavailable"; countryName?: string };
export type CheckResult = { ok: true; name: string; phoneMasked: string } | { ok: false; error: "invalid-token" | "unavailable" };

// Nothing here logs: names and phones must not reach server logs (spec 4.5). Failures become error codes.

/** The gate: validate, rate-limit by address, upsert on phone, return a token for that row (spec 4.4, 4.5). */
export async function registerClient(deps: RegisterDeps, input: RegisterInput): Promise<RegisterResult> {
  // A bot that fills the hidden field is told it worked, and nothing is written.
  if (typeof input.website === "string" && input.website.trim()) return { ok: true, token: "", phone: "", name: "" };
  if (!deps.limiter.take(input.ip || "unknown")) return { ok: false, error: "rate" };
  const name = typeof input.name === "string" ? input.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 1 || name.length > 80) return { ok: false, error: "name" };
  const country = typeof input.country === "string" && isSupportedCountry(input.country) ? input.country : "IN";
  const phone = parsePhone(typeof input.phone === "string" ? input.phone : "", country);
  if (!phone.ok) return { ok: false, error: "phone", countryName: phone.countryName };
  if (input.consent !== true || input.consentVersion !== CONSENT_VERSION) return { ok: false, error: "consent" };
  try {
    const row = await deps.store.upsertClient({ phone: phone.e164, name, consentAt: deps.now().toISOString(), consentVersion: CONSENT_VERSION });
    return { ok: true, token: signClientToken(row.id, deps.secret), phone: row.phone, name };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/** For a returning phone: who does this token belong to? A deleted client means the token is no longer valid. */
export async function checkClient(deps: Pick<RegisterDeps, "store" | "secret">, token: unknown): Promise<CheckResult> {
  const v = verifyClientToken(token, deps.secret);
  if (!v.ok) return { ok: false, error: "invalid-token" };
  try {
    const row = await deps.store.getClient(v.clientId);
    return row ? { ok: true, name: row.name, phoneMasked: maskPhone(row.phone) } : { ok: false, error: "invalid-token" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
