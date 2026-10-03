import type { Look } from "../../catalogue.ts";
import { TryOnError, type TryOnProvider } from "./tryon-provider.ts";

// The go or no-go spike (spec section 8, step 5): both candidate models on the three catalogue looks.

export const SPIKE_MODELS = ["gemini-3.1-flash-image", "gemini-3-pro-image"] as const;
export const SPIKE_CRITERIA = ["Dupatta preserved", "Embroidery recognisable", "Colour accurate", "Silhouette correct", "Person unchanged"] as const;

export interface SpikeResult { model: string; slug: string; file?: string; error?: string; ms: number }

export async function runSpike(o: { models: readonly string[]; looks: Look[]; person: Blob; provider(model: string): TryOnProvider; loadGarment(look: Look): Promise<Blob>; write(name: string, image: Blob): Promise<void>; now?: () => number }): Promise<SpikeResult[]> {
  const now = o.now ?? Date.now; const results: SpikeResult[] = [];
  for (const model of o.models) for (const look of o.looks) {
    const start = now();
    try {
      const out = await o.provider(model).tryOn({ person: o.person, garment: await o.loadGarment(look), lookSlug: look.slug });
      const file = `${model}/${look.slug}.${out.image.type === "image/jpeg" ? "jpg" : "png"}`;
      await o.write(file, out.image);
      results.push({ model, slug: look.slug, file, ms: now() - start });
    } catch (e) {
      results.push({ model, slug: look.slug, error: e instanceof TryOnError ? e.code : "error", ms: now() - start });
    }
  }
  return results;
}

/** A table to paste into docs/FIT-SPIKE-REPORT.md and score by eye, 1 to 5 per criterion. */
export function scoringTable(results: SpikeResult[]): string {
  const head = `| Model | Look | Output | Seconds | ${SPIKE_CRITERIA.join(" | ")} |`;
  const rule = `|${" --- |".repeat(4 + SPIKE_CRITERIA.length)}`;
  const rows = results.map(r => `| ${r.model} | ${r.slug} | ${r.file ?? `failed: ${r.error}`} | ${(r.ms / 1000).toFixed(1)} |${" |".repeat(SPIKE_CRITERIA.length)}`);
  return [head, rule, ...rows].join("\n");
}
