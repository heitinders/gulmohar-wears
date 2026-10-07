import { test } from "node:test";
import assert from "node:assert/strict";
import { SPIKE_CRITERIA, SPIKE_MODELS, runSpike, scoringTable } from "./spike.ts";
import { createFakeProvider, TryOnError, type TryOnProvider } from "./tryon-provider.ts";
import { looks } from "../../catalogue.ts";

const person = new Blob([Buffer.from("p")], { type: "image/jpeg" });

test("runs every model on every look and records failures without stopping", async () => {
  const written: string[] = [];
  const failing: TryOnProvider = { async tryOn() { throw new TryOnError("blocked"); } };
  const results = await runSpike({
    models: SPIKE_MODELS, looks, person,
    provider: m => (m === SPIKE_MODELS[1] ? failing : createFakeProvider()),
    loadGarment: async () => new Blob([Buffer.from("g")], { type: "image/jpeg" }),
    write: async (name) => { written.push(name); },
  });
  assert.equal(results.length, SPIKE_MODELS.length * looks.length);
  assert.equal(written.length, looks.length);
  assert.ok(written.every(n => n.startsWith(`${SPIKE_MODELS[0]}/`)));
  assert.ok(results.filter(r => r.model === SPIKE_MODELS[1]).every(r => r.error === "blocked"));
});

test("the models are the two candidates the spec names", () => {
  assert.deepEqual(SPIKE_MODELS, ["gemini-3.1-flash-image", "gemini-3-pro-image"]);
});

test("the scoring table lists each criterion for each output", () => {
  const t = scoringTable([{ model: "a", slug: "olive-gold-suit", file: "a/olive-gold-suit.png", ms: 1200 }, { model: "b", slug: "blue-suit", error: "timeout", ms: 45000 }]);
  for (const c of SPIKE_CRITERIA) assert.ok(t.includes(c), c);
  assert.ok(t.includes("a/olive-gold-suit.png")); assert.ok(t.includes("timeout"));
  assert.doesNotMatch(t, /[—–]/);
});
