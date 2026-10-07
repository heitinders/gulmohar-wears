import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { findLook } from "../../catalogue.ts";
import { tryOnConfig } from "./config.ts";
import { fitDeps } from "./deps.ts";
import { requireStaff } from "./studio.ts";
import { SESSION_COOKIES } from "./studio-auth.ts";
import { createFakeProvider, createGeminiProvider } from "./tryon-provider.ts";
import { indiaDay, type TryOnDeps } from "./tryon.ts";

/** The catalogue look's full-silhouette photo, read from the deployed files (traced in next.config.ts). */
async function loadGarment(slug: string): Promise<Blob | null> {
  const look = findLook(slug); if (!look) return null;
  const image = look.images.find(i => i.caption === "The full silhouette") ?? look.images[0];
  try { return new Blob([await readFile(join(process.cwd(), "public/media", `${image.id}-1600.jpg`))], { type: "image/jpeg" }); } catch { return null; }
}

export async function tryOnDeps(): Promise<TryOnDeps | null> {
  const deps = fitDeps(); if (!deps) return null;
  const config = tryOnConfig();
  const provider = !config.available ? null : config.provider === "fake" ? createFakeProvider() : createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY!, model: config.model! });
  return {
    config, store: deps.store, secret: deps.secret, provider, loadGarment, today: () => indiaDay(),
    // Studio staff use the same route with their session instead of a customer token (spec 4.5).
    staff: async () => { const s = await requireStaff(deps, { access: (await cookies()).get(SESSION_COOKIES.access)?.value }); return s.ok ? { id: s.user.id } : null; },
  };
}
