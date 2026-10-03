// Which backend and which try-on provider this deployment may use. Pure: pass process.env in.
export type Env = Record<string, string | undefined>;
export type FitBackend = "supabase" | "memory" | "off";

const isProduction = (env: Env) => env.NODE_ENV === "production" || env.VERCEL_ENV === "production";

const SUPABASE_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "FIT_TOKEN_SECRET"] as const;
export const MIN_TOKEN_SECRET = 16; // token.ts refuses to sign with less
const shortSecret = (env: Env) => !!env.FIT_TOKEN_SECRET && env.FIT_TOKEN_SECRET.length < MIN_TOKEN_SECRET;

/** Supabase when fully configured; the in-memory store only for local development and tests; otherwise off (part 1 behaviour). */
export function fitBackend(env: Env = process.env): FitBackend {
  // A short secret would turn the gate on and then fail every sign-up, locking customers out of measuring.
  if (shortSecret(env)) return "off";
  if (SUPABASE_KEYS.every(k => env[k])) return "supabase";
  if (env.FIT_BACKEND === "memory" && !isProduction(env)) return "memory";
  return "off";
}

export const DEFAULT_DAILY_CAP = 6;
export const DEFAULT_STUDIO_CAP = 30;
/** Previews across the whole deployment per India day: the spending brake if many phones join at once. */
export const DEFAULT_GLOBAL_CAP = 150;
const cap = (raw: string | undefined, fallback: number) => (raw && /^[1-9][0-9]{0,3}$/.test(raw) ? Number(raw) : fallback);

export interface TryOnConfig {
  available: boolean; provider: "gemini" | "fake" | null; model: string | null; dailyCap: number; studioCap: number; globalCap: number;
  reason?: "no-backend" | "disabled" | "paid-tier-unconfirmed" | "no-provider";
}

/** Try-on stays off until the spike passes (FIT_TRYON_ENABLED) and the key is confirmed as paid tier (spec 4.6). */
export function tryOnConfig(env: Env = process.env): TryOnConfig {
  const base = { dailyCap: cap(env.FIT_TRYON_DAILY_CAP, DEFAULT_DAILY_CAP), studioCap: cap(env.FIT_STUDIO_DAILY_CAP, DEFAULT_STUDIO_CAP), globalCap: cap(env.FIT_TRYON_GLOBAL_DAILY_CAP, DEFAULT_GLOBAL_CAP) };
  const off = (reason: NonNullable<TryOnConfig["reason"]>): TryOnConfig => ({ available: false, provider: null, model: null, ...base, reason });
  if (fitBackend(env) === "off") return off("no-backend");
  if (env.FIT_TRYON_ENABLED !== "true") return off("disabled");
  if (env.GEMINI_PAID_TIER_CONFIRMED !== "true") return off("paid-tier-unconfirmed");
  if (env.FIT_TRYON_PROVIDER === "fake" && !isProduction(env)) return { available: true, provider: "fake", model: "fake", ...base };
  if (env.GEMINI_API_KEY && env.GEMINI_IMAGE_MODEL) return { available: true, provider: "gemini", model: env.GEMINI_IMAGE_MODEL, ...base };
  return off("no-provider");
}

/** Misconfigurations worth one line in the server log. Names variables only, never values. */
export function fitConfigProblems(env: Env = process.env): string[] {
  if (shortSecret(env)) return [`FIT_TOKEN_SECRET must be at least ${MIN_TOKEN_SECRET} characters; Find your fit is off until it is.`];
  const missing = SUPABASE_KEYS.filter(k => !env[k]);
  if (missing.length && missing.length < SUPABASE_KEYS.length && env.NEXT_PUBLIC_SUPABASE_URL) return [`Supabase is partly configured (missing ${missing.join(", ")}); Find your fit is off until all four are set.`];
  return [];
}
