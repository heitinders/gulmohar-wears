import "server-only";
import { fitBackend, fitConfigProblems, gateHourlyLimit, tryOnConfig, type FitBackend } from "./config.ts";
import { createMemoryStore, type FitStore } from "./store.ts";
import type { StudioAuth, StudioData } from "./studio-auth.ts";
import { createSupabaseStore } from "./supabase-store.ts";
import { createRateLimiter } from "./rate-limit.ts";
import { memoryWorld } from "./memory-world.ts";
import { studioDeps } from "./studio-deps.ts";

// The one place environment variables become customer-side server dependencies, including the service-role key
// and FIT_TOKEN_SECRET. `server-only` makes a client import of this module a build error.

export interface FitDeps {
  backend: Exclude<FitBackend, "off">; store: FitStore; secret: string; now: () => Date;
  limiter: { take(key: string): boolean }; auth: StudioAuth; studioData(accessToken: string): StudioData;
}

const g = globalThis as typeof globalThis & { __gwFitLimiter?: ReturnType<typeof createRateLimiter> };
const gateLimiter = () => (g.__gwFitLimiter ??= createRateLimiter({ limit: gateHourlyLimit(), windowMs: 60 * 60 * 1000 }));

const reported = globalThis as typeof globalThis & { __gwFitConfigReported?: boolean };

export function fitDeps(): FitDeps | null {
  if (!reported.__gwFitConfigReported) { reported.__gwFitConfigReported = true; for (const p of fitConfigProblems()) console.error(`[find-your-fit] ${p}`); }
  const backend = fitBackend(); const studio = studioDeps();
  const now = () => new Date();
  if (backend === "supabase" && studio) {
    return { backend, now, secret: process.env.FIT_TOKEN_SECRET!, limiter: gateLimiter(), store: createSupabaseStore(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!), ...studio };
  }
  if (backend === "memory" && studio) {
    const w = memoryWorld();
    return { backend, now, secret: process.env.FIT_TOKEN_SECRET || "memory-backend-development-secret", limiter: w.limiter, store: createMemoryStore(now, w.state), ...studio };
  }
  return null;
}

export { fitBackend, tryOnConfig };
