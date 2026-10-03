import { newMemoryState, type MemoryState } from "./store.ts";
import { createMemoryAuth } from "./studio-auth.ts";
import { createRateLimiter } from "./rate-limit.ts";

// The development and Playwright stand-in for Supabase, shared through globalThis so the page server, Server
// Functions and proxy.ts all see the same clients, sessions and counts. fitBackend() never selects it in production.
export type MemoryWorld = { state: MemoryState; auth: ReturnType<typeof createMemoryAuth>; limiter: ReturnType<typeof createRateLimiter> };
const g = globalThis as typeof globalThis & { __gwFitMemory?: MemoryWorld };

export function memoryWorld(env: Record<string, string | undefined> = process.env): MemoryWorld {
  return (g.__gwFitMemory ??= {
    state: newMemoryState(),
    auth: createMemoryAuth(env.STUDIO_DEV_EMAIL && env.STUDIO_DEV_PASSWORD ? [{ email: env.STUDIO_DEV_EMAIL, password: env.STUDIO_DEV_PASSWORD, staff: true }] : []),
    limiter: createRateLimiter({ limit: Number(env.FIT_DEV_GATE_LIMIT) || 10, windowMs: 60 * 60 * 1000 }),
  });
}
