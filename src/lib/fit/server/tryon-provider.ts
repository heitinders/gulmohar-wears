import { findLook } from "../../catalogue.ts";
import { TRYON_PROMPT_VERSION, buildTryOnPrompt } from "../tryon-prompt.ts";

export interface TryOnInput { person: Blob; garment: Blob; lookSlug: string }
export interface TryOnOutput { image: Blob; model: string; promptVersion: string }
export interface TryOnProvider { tryOn(input: TryOnInput): Promise<TryOnOutput> }

export type TryOnErrorCode = "timeout" | "vendor" | "no-image" | "blocked";
/** Messages are fixed strings: no vendor text, no image data and no key ever reach a log or a response. */
export class TryOnError extends Error {
  readonly code: TryOnErrorCode;
  constructor(code: TryOnErrorCode) { super(`try-on ${code}`); this.code = code; this.name = "TryOnError"; }
}

const toPart = async (b: Blob) => ({ inline_data: { mime_type: b.type || "image/jpeg", data: Buffer.from(await b.arrayBuffer()).toString("base64") } });

type Part = { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } };
type GenerateResponse = { candidates?: { finishReason?: string; content?: { parts?: Part[] } }[]; promptFeedback?: { blockReason?: string } };

/** Gemini image editing over REST generateContent. The model id comes from GEMINI_IMAGE_MODEL (spec 4.6). */
export function createGeminiProvider({ apiKey, model, fetch: doFetch = fetch, timeoutMs = 45_000 }: { apiKey: string; model: string; fetch?: typeof fetch; timeoutMs?: number }): TryOnProvider {
  return {
    async tryOn({ person, garment, lookSlug }) {
      const look = findLook(lookSlug); if (!look) throw new TryOnError("vendor");
      const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: buildTryOnPrompt(look) }, await toPart(person), await toPart(garment)] }], generationConfig: { responseModalities: ["IMAGE"] } });
      const abort = new AbortController(); let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; abort.abort(); }, timeoutMs);
      let json: GenerateResponse;
      try {
        const res = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body, signal: abort.signal });
        if (!res.ok) throw new TryOnError("vendor");
        json = await res.json(); // still inside the timeout: a stalled body counts as a slow vendor
      } catch (e) {
        throw e instanceof TryOnError ? e : new TryOnError(timedOut ? "timeout" : "vendor");
      } finally {
        clearTimeout(timer);
      }
      if (json.promptFeedback?.blockReason) throw new TryOnError("blocked");
      const candidate = json.candidates?.[0];
      if (candidate?.finishReason && /SAFETY|PROHIBITED|BLOCK/i.test(candidate.finishReason)) throw new TryOnError("blocked");
      for (const part of candidate?.content?.parts ?? []) {
        const data = part.inlineData?.data ?? part.inline_data?.data;
        const type = part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? "image/png";
        if (data) return { image: new Blob([Buffer.from(data, "base64")], { type }), model, promptVersion: TRYON_PROMPT_VERSION };
      }
      throw new TryOnError("no-image");
    },
  };
}

/** Development and Playwright only: returns the catalogue image unchanged. tryOnConfig() refuses it in production. */
export function createFakeProvider(): TryOnProvider {
  return { async tryOn({ garment }) { return { image: garment, model: "fake", promptVersion: TRYON_PROMPT_VERSION }; } };
}
