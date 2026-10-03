import { test } from "node:test";
import assert from "node:assert/strict";
import { TRYON_PROMPT_VERSION, buildTryOnPrompt } from "./tryon-prompt.ts";
import { looks } from "../catalogue.ts";

test("the prompt is versioned", () => { assert.equal(TRYON_PROMPT_VERSION, "tryon-2026-10-03"); });

test("the prompt carries every requirement from spec 4.6", () => {
  const p = buildTryOnPrompt(looks[0]).toLowerCase();
  for (const must of ["face", "skin tone", "body shape", "proportions", "pose", "background", "only the clothing", "kameez", "dupatta", "trousers", "embroidery placement", "colour", "sheer", "do not beautify", "slim", "one photorealistic image"]) assert.ok(p.includes(must), must);
});

test("the prompt names the look and has no dashes", () => {
  for (const look of looks) { const p = buildTryOnPrompt(look); assert.ok(p.includes(look.name), look.slug); assert.doesNotMatch(p, /[—–]/); }
});
