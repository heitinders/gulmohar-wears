import { test } from "node:test";
import assert from "node:assert/strict";
import { TryOnError, createFakeProvider, createGeminiProvider } from "./tryon-provider.ts";

// Response bodies follow the documented generateContent shape (ai.google.dev/api/generate-content). They are
// constructed, not recorded: replace with a recorded response once the spike has run against the paid key.
const IMAGE = Buffer.from("fake-png-bytes").toString("base64");
const camel = { candidates: [{ content: { parts: [{ text: "Here is the preview." }, { inlineData: { mimeType: "image/png", data: IMAGE } }] } }] };
const snake = { candidates: [{ content: { parts: [{ inline_data: { mime_type: "image/jpeg", data: IMAGE } }] } }] };
const person = new Blob([Buffer.from("person-photo-bytes")], { type: "image/jpeg" });
const garment = new Blob([Buffer.from("garment-photo-bytes")], { type: "image/jpeg" });
const input = { person, garment, lookSlug: "olive-gold-suit" };

type Call = { url: string; init: RequestInit };
const fakeFetch = (body: unknown, status = 200) => { const calls: Call[] = []; const f = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }) as unknown as typeof fetch; return { f, calls }; };

test("sends both images and the prompt, with the key only in the header", async () => {
  const { f, calls } = fakeFetch(camel);
  const p = createGeminiProvider({ apiKey: "secret-key", model: "gemini-3.1-flash-image", fetch: f });
  const out = await p.tryOn(input);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent");
  assert.doesNotMatch(calls[0].url, /secret-key/);
  assert.equal((calls[0].init.headers as Record<string, string>)["x-goog-api-key"], "secret-key");
  const body = JSON.parse(String(calls[0].init.body));
  const parts = body.contents[0].parts;
  assert.equal(parts.length, 3); assert.match(parts[0].text, /Olive-gold embroidered suit/);
  assert.equal(parts[1].inline_data.mime_type, "image/jpeg"); assert.equal(parts[1].inline_data.data, Buffer.from("person-photo-bytes").toString("base64"));
  assert.equal(parts[2].inline_data.data, Buffer.from("garment-photo-bytes").toString("base64"));
  assert.deepEqual(body.generationConfig.responseModalities, ["IMAGE"]);
  assert.equal(out.model, "gemini-3.1-flash-image"); assert.equal(out.promptVersion, "tryon-2026-10-03");
  assert.equal(out.image.type, "image/png"); assert.equal(Buffer.from(await out.image.arrayBuffer()).toString(), "fake-png-bytes");
});

test("reads the snake_case response shape too", async () => {
  const out = await createGeminiProvider({ apiKey: "k", model: "m", fetch: fakeFetch(snake).f }).tryOn(input);
  assert.equal(out.image.type, "image/jpeg");
});

const code = async (p: Promise<unknown>) => { try { await p; return "none"; } catch (e) { assert.ok(e instanceof TryOnError); assert.doesNotMatch(e.message, new RegExp(IMAGE.slice(0, 12))); assert.doesNotMatch(e.message, /person-photo|secret/); return e.code; } };

test("maps failures to codes without leaking image data", async () => {
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: fakeFetch({ promptFeedback: { blockReason: "SAFETY" } }).f }).tryOn(input)), "blocked");
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: fakeFetch({ candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] }).f }).tryOn(input)), "blocked");
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: fakeFetch({ candidates: [{ content: { parts: [{ text: "no" }] } }] }).f }).tryOn(input)), "no-image");
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: fakeFetch({ error: { message: `bad ${IMAGE}` } }, 500).f }).tryOn(input)), "vendor");
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: fakeFetch({}, 429).f }).tryOn(input)), "vendor");
  const throwing = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: throwing }).tryOn(input)), "vendor");
  const invalidJson = (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch;
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: invalidJson }).tryOn(input)), "vendor");
});

test("a slow vendor times out", async () => {
  const slow = ((_: string, init: RequestInit) => new Promise((_r, reject) => { init.signal?.addEventListener("abort", () => reject(init.signal!.reason)); })) as unknown as typeof fetch;
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: slow, timeoutMs: 20 }).tryOn(input)), "timeout");
});

test("an unknown look is refused before any call", async () => {
  const { f, calls } = fakeFetch(camel);
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: f }).tryOn({ ...input, lookSlug: "nope" })), "vendor");
  assert.equal(calls.length, 0);
});

test("the fake provider returns the garment image for development", async () => {
  const out = await createFakeProvider().tryOn(input);
  assert.equal(out.model, "fake"); assert.equal(Buffer.from(await out.image.arrayBuffer()).toString(), "garment-photo-bytes");
});

test("a response whose body stalls also times out", async () => {
  const stalled = ((_: string, init: RequestInit) => Promise.resolve(new Response(new ReadableStream({ start(c) { init.signal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError"))); } }), { status: 200 }))) as unknown as typeof fetch;
  assert.equal(await code(createGeminiProvider({ apiKey: "k", model: "m", fetch: stalled, timeoutMs: 20 }).tryOn(input)), "timeout");
});
