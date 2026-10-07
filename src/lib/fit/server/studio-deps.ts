import { fitBackend } from "./config.ts";
import { createMemoryStudioData, type StudioAuth, type StudioData } from "./studio-auth.ts";
import { createSupabaseAuth, createSupabaseStudioData } from "./supabase-store.ts";
import { memoryWorld } from "./memory-world.ts";

/**
 * Staff sign-in and staff data access. Uses only the public Supabase URL and anon key (RLS does the rest),
 * so proxy.ts may import it. Customer writes with the service role live in deps.ts, which is server-only.
 */
export function studioDeps(): { auth: StudioAuth; studioData(accessToken: string): StudioData } | null {
  const backend = fitBackend();
  if (backend === "supabase") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return { auth: createSupabaseAuth(url, anon), studioData: t => createSupabaseStudioData(url, anon, t) };
  }
  if (backend === "memory") { const w = memoryWorld(); return { auth: w.auth, studioData: t => createMemoryStudioData(w.auth, w.state, t) }; }
  return null;
}
