import { whatsappUrl } from "../../enquiries/messages.ts";
import { verifyClientToken } from "./token.ts";
import { TryOnError, type TryOnProvider } from "./tryon-provider.ts";
import type { TryOnConfig } from "./config.ts";
import type { FitStore } from "./store.ts";

// POST /api/fit/try-on and /api/fit/try-on/report (spec 4.5). Images are held in memory for the one request and
// never written, logged or echoed in an error. Nothing in this file logs.

/** Vercel functions refuse bodies over 4.5 MB; the phone sends a 1600px JPEG of a few hundred kB. */
export const MAX_TRYON_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const STATUS: Record<TryOnError["code"], number> = { timeout: 504, vendor: 502, "no-image": 502, blocked: 422 };

export interface TryOnDeps {
  config: TryOnConfig; store: FitStore; secret: string; provider: TryOnProvider | null;
  loadGarment(slug: string): Promise<Blob | null>; staff(): Promise<{ id: string } | null>; today(): string;
}
export type TryOnResult = { status: number; json?: Record<string, unknown>; image?: Blob; model?: string; promptVersion?: string };

/** The day a cap belongs to, in India where the atelier works. */
export const indiaDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

type Identity = { key: string; cap: number } | { error: TryOnResult };
async function identify(deps: TryOnDeps, token: unknown): Promise<Identity> {
  if (typeof token === "string" && token) {
    const v = verifyClientToken(token, deps.secret);
    if (!v.ok) return { error: { status: 401, json: { error: "invalid-token" } } };
    const client = await deps.store.getClient(v.clientId);
    return client ? { key: client.phone, cap: deps.config.dailyCap } : { error: { status: 401, json: { error: "invalid-token" } } };
  }
  const staff = await deps.staff();
  return staff ? { key: `staff:${staff.id}`, cap: deps.config.studioCap } : { error: { status: 401, json: { error: "invalid-token" } } };
}

export async function handleTryOn(deps: TryOnDeps, req: { contentLength: number | null; readForm(): Promise<FormData> }): Promise<TryOnResult> {
  if (!deps.config.available || !deps.provider) return { status: 503, json: { error: "unavailable" } };
  if (req.contentLength != null && req.contentLength > MAX_TRYON_BYTES) return { status: 413, json: { error: "too-large" } };
  let form: FormData;
  try { form = await req.readForm(); } catch { return { status: 400, json: { error: "form" } }; }
  const person = form.get("person");
  if (person instanceof Blob && person.size > MAX_TRYON_BYTES) return { status: 413, json: { error: "too-large" } };
  try {
    const who = await identify(deps, form.get("token"));
    if ("error" in who) return who.error;
    const slug = form.get("look");
    const garment = typeof slug === "string" && /^[a-z0-9-]{1,60}$/.test(slug) ? await deps.loadGarment(slug) : null;
    if (!garment || typeof slug !== "string") return { status: 400, json: { error: "look" } };
    if (!(person instanceof Blob) || !person.size || !TYPES.has(person.type)) return { status: 415, json: { error: "type" } };
    const day = deps.today();
    if ((await deps.store.getUsage(who.key, day)).tryons >= who.cap) {
      return { status: 429, json: { error: "cap", whatsapp: whatsappUrl("Hi Gulmohar, I have used today's try-on previews. Could you help me choose a look?") } };
    }
    let out;
    try { out = await deps.provider.tryOn({ person, garment, lookSlug: slug }); }
    catch (e) { const code = e instanceof TryOnError ? e.code : "vendor"; return { status: STATUS[code], json: { error: code } }; }
    // Count only a preview that was actually made. If counting fails the customer still gets the image.
    try { await deps.store.bumpUsage(who.key, day, "tryons"); } catch { /* not counted */ }
    return { status: 200, image: out.image, model: out.model, promptVersion: out.promptVersion };
  } catch {
    return { status: 503, json: { error: "unavailable" } };
  }
}

/** "Report this preview": a count only, no content (spec 4.3). */
export async function handleReport(deps: TryOnDeps, fields: { token?: unknown }): Promise<TryOnResult> {
  if (!deps.config.available) return { status: 503, json: { error: "unavailable" } };
  try {
    const who = await identify(deps, fields.token);
    if ("error" in who) return who.error;
    await deps.store.bumpUsage(who.key, deps.today(), "reports");
    return { status: 200, json: { ok: true } };
  } catch {
    return { status: 503, json: { error: "unavailable" } };
  }
}
