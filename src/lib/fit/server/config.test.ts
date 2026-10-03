import { test } from "node:test";
import assert from "node:assert/strict";
import { fitBackend, tryOnConfig } from "./config.ts";

const supa = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service", FIT_TOKEN_SECRET: "s".repeat(32) };
const tryOn = { FIT_TRYON_ENABLED: "true", GEMINI_PAID_TIER_CONFIRMED: "true", GEMINI_API_KEY: "key", GEMINI_IMAGE_MODEL: "gemini-3.1-flash-image" };

test("supabase needs all four values", () => {
  assert.equal(fitBackend(supa), "supabase");
  for (const k of Object.keys(supa)) assert.equal(fitBackend({ ...supa, [k]: "" }), "off", k);
});

test("memory only outside production", () => {
  assert.equal(fitBackend({ FIT_BACKEND: "memory", NODE_ENV: "development" }), "memory");
  assert.equal(fitBackend({ FIT_BACKEND: "memory", NODE_ENV: "test" }), "memory");
  assert.equal(fitBackend({ FIT_BACKEND: "memory", NODE_ENV: "production" }), "off");
  assert.equal(fitBackend({ FIT_BACKEND: "memory", NODE_ENV: "development", VERCEL_ENV: "production" }), "off");
});

test("nothing configured is off", () => { assert.equal(fitBackend({}), "off"); });

test("supabase wins over memory when both are set", () => {
  assert.equal(fitBackend({ ...supa, FIT_BACKEND: "memory", NODE_ENV: "development" }), "supabase");
});

test("try-on available with gemini when every switch is on", () => {
  const c = tryOnConfig({ ...supa, ...tryOn });
  assert.equal(c.available, true); assert.equal(c.provider, "gemini"); assert.equal(c.model, "gemini-3.1-flash-image");
  assert.equal(c.dailyCap, 6); assert.equal(c.studioCap, 30);
});

test("try-on refuses without the paid-tier confirmation", () => {
  const c = tryOnConfig({ ...supa, ...tryOn, GEMINI_PAID_TIER_CONFIRMED: "" });
  assert.equal(c.available, false); assert.equal(c.reason, "paid-tier-unconfirmed");
  assert.equal(tryOnConfig({ ...supa, ...tryOn, GEMINI_PAID_TIER_CONFIRMED: "yes" }).available, false);
});

test("try-on stays off until enabled after the spike", () => {
  assert.equal(tryOnConfig({ ...supa, ...tryOn, FIT_TRYON_ENABLED: "" }).reason, "disabled");
});

test("try-on needs a backend for the caps", () => {
  assert.equal(tryOnConfig({ ...tryOn }).reason, "no-backend");
});

test("try-on needs a key and a model for gemini", () => {
  assert.equal(tryOnConfig({ ...supa, ...tryOn, GEMINI_API_KEY: "" }).reason, "no-provider");
  assert.equal(tryOnConfig({ ...supa, ...tryOn, GEMINI_IMAGE_MODEL: "" }).reason, "no-provider");
});

test("the fake provider works only outside production", () => {
  const dev = { FIT_BACKEND: "memory", NODE_ENV: "development", FIT_TRYON_ENABLED: "true", GEMINI_PAID_TIER_CONFIRMED: "true", FIT_TRYON_PROVIDER: "fake" };
  assert.equal(tryOnConfig(dev).provider, "fake"); assert.equal(tryOnConfig(dev).available, true);
  assert.equal(tryOnConfig({ ...supa, ...tryOn, GEMINI_API_KEY: "", FIT_TRYON_PROVIDER: "fake", NODE_ENV: "production" }).available, false);
});

test("caps parse whole numbers and fall back on garbage", () => {
  assert.equal(tryOnConfig({ ...supa, ...tryOn, FIT_TRYON_DAILY_CAP: "2", FIT_STUDIO_DAILY_CAP: "50" }).dailyCap, 2);
  assert.equal(tryOnConfig({ ...supa, ...tryOn, FIT_STUDIO_DAILY_CAP: "50" }).studioCap, 50);
  for (const bad of ["", "abc", "-3", "0", "2.5", "1e9"]) assert.equal(tryOnConfig({ ...supa, ...tryOn, FIT_TRYON_DAILY_CAP: bad }).dailyCap, 6, bad);
});
