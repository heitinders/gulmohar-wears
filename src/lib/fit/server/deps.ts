import "server-only";
import { fitBackend, tryOnConfig, type FitBackend } from "./config.ts";
import { createMemoryStore, newMemoryState, type FitStore, type MemoryState } from "./store.ts";
import { createMemoryAuth, createMemoryStudioData, type StudioAuth, type StudioData } from "./studio-auth.ts";
import { createSupabaseAuth, createSupabaseStore, createSupabaseStudioData } from "./supabase-store.ts";
import { createRateLimiter } from "./rate-limit.ts";

// The one place environment variables become server dependencies. Secrets never leave this module's callers.

export interface FitDeps {
  backend: Exclude<FitBackend, "off">; store: FitStore; secret: string; now: () => Date;
  limiter: { take(key: string): boolean }; auth: StudioAuth; studioData(accessToken: string): StudioData;
}

type MemoryWorld = { state: MemoryState; auth: ReturnType<typeof createMemoryAuth>; limiter: ReturnType<typeof createRateLimiter> };
const g = globalThis as typeof globalThis & { __gwFitMemory?: MemoryWorld; __gwFitLimiter?: ReturnType<typeof createRateLimiter> };
const gateLimiter = () => (g.__gwFitLimiter ??= createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 }));

/** Shared across hot reloads in development so a registered client survives an edit. */
function memoryWorld(): MemoryWorld {
  return (g.__gwFitMemory ??= {
    state: newMemoryState(),
    auth: createMemoryAuth(process.env.STUDIO_DEV_EMAIL && process.env.STUDIO_DEV_PASSWORD ? [{ email: process.env.STUDIO_DEV_EMAIL, password: process.env.STUDIO_DEV_PASSWORD, staff: true }] : []),
    limiter: createRateLimiter({ limit: Number(process.env.FIT_DEV_GATE_LIMIT) || 10, windowMs: 60 * 60 * 1000 }),
  });
}

export function fitDeps(): FitDeps | null {
  const backend = fitBackend();
  const now = () => new Date();
  if (backend === "supabase") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return { backend, now, secret: process.env.FIT_TOKEN_SECRET!, limiter: gateLimiter(), store: createSupabaseStore(url, process.env.SUPABASE_SERVICE_ROLE_KEY!), auth: createSupabaseAuth(url, anon), studioData: token => createSupabaseStudioData(url, anon, token) };
  }
  if (backend === "memory") {
    const w = memoryWorld();
    return { backend, now, secret: process.env.FIT_TOKEN_SECRET || "memory-backend-development-secret", limiter: w.limiter, store: createMemoryStore(now, w.state), auth: w.auth, studioData: token => createMemoryStudioData(w.auth, w.state, token) };
  }
  return null;
}

export { fitBackend, tryOnConfig };
