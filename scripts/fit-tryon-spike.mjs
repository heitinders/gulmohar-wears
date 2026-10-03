// Find Your Fit try-on spike (spec section 8, step 5). Run once the client has a billing-enabled Gemini key and a
// consenting test person:
//   GEMINI_API_KEY=... GEMINI_PAID_TIER_CONFIRMED=true node --experimental-strip-types scripts/fit-tryon-spike.mjs --person ./person.jpg
// Outputs go to .fit-spike/ (gitignored, never deployed). Paste the printed table into docs/FIT-SPIKE-REPORT.md and score it.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { looks } from "../src/lib/catalogue.ts";
import { createGeminiProvider } from "../src/lib/fit/server/tryon-provider.ts";
import { SPIKE_MODELS, runSpike, scoringTable } from "../src/lib/fit/server/spike.ts";

const root = new URL("..", import.meta.url).pathname;
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const personPath = arg("--person");
if (!personPath) { console.error("Usage: --person path/to/consenting-test-person.jpg"); process.exit(2); }
if (process.env.GEMINI_PAID_TIER_CONFIRMED !== "true") { console.error("Refusing: set GEMINI_PAID_TIER_CONFIRMED=true only for a billing-enabled key. Unpaid keys let Google use and review the photos."); process.exit(2); }
if (!process.env.GEMINI_API_KEY) { console.error("GEMINI_API_KEY is not set."); process.exit(2); }

const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const person = new Blob([await readFile(personPath)], { type: types[extname(personPath).toLowerCase()] ?? "image/jpeg" });
const out = join(root, ".fit-spike");
const results = await runSpike({
  models: SPIKE_MODELS, looks, person,
  provider: model => createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model }),
  loadGarment: async look => new Blob([await readFile(join(root, "public/media", `${look.images[0].id}-1600.jpg`))], { type: "image/jpeg" }),
  write: async (name, image) => { const file = join(out, name); await mkdir(dirname(file), { recursive: true }); await writeFile(file, Buffer.from(await image.arrayBuffer())); },
});
console.log(scoringTable(results));
console.log(`\nImages are in ${out}. Score each 1 to 5, then record the decision in docs/FIT-SPIKE-REPORT.md.`);
