import { test } from "node:test";
import assert from "node:assert/strict";
import { countryOptions, maskPhone } from "./phone.ts";
import { parsePhone } from "./phone-parse.ts";
import { CONSENT_TEXT, CONSENT_VERSION } from "./consent.ts";

const E164 = /^\+[1-9][0-9]{6,14}$/; // the database check in supabase/migrations

test("an Indian mobile typed with spaces becomes E.164", () => {
  assert.deepEqual(parsePhone("98765 43210", "IN"), { ok: true, e164: "+919876543210", country: "IN" });
});

test("an international number pasted with + wins over the selected country", () => {
  assert.deepEqual(parsePhone("+44 7400 123456", "IN"), { ok: true, e164: "+447400123456", country: "GB" });
});

test("a number dialled with India's 00 exit code is read as that country's number", () => {
  assert.deepEqual(parsePhone("0044 7400 123456", "IN"), { ok: true, e164: "+447400123456", country: "GB" });
});

test("a number too short for India is refused and the error names India", () => {
  assert.deepEqual(parsePhone("7400 1234", "IN"), { ok: false, reason: "invalid", countryName: "India" });
});

test("too short is invalid and blank is empty", () => {
  assert.equal(parsePhone("12", "IN").ok, false);
  assert.deepEqual(parsePhone("   ", "GB"), { ok: false, reason: "empty", countryName: "United Kingdom" });
});

test("a US number in national format", () => {
  const r = parsePhone("(415) 555-2671", "US");
  assert.ok(r.ok); assert.equal(r.e164, "+14155552671");
});

test("a leading national 0 is accepted where the country uses one", () => {
  const r = parsePhone("07400 123456", "GB");
  assert.ok(r.ok); assert.equal(r.e164, "+447400123456");
});

test("letters and an unknown country never throw", () => {
  assert.equal(parsePhone("call me", "IN").ok, false);
  assert.equal(parsePhone("98765 43210", "XX" as never).ok, false);
});

test("every accepted number matches the database check", () => {
  for (const [n, c] of [["98765 43210", "IN"], ["+1 604 555 0123", "IN"], ["0412 345 678", "AU"], ["+971 50 123 4567", "IN"]] as const) {
    const r = parsePhone(n, c); assert.ok(r.ok, n); assert.match(r.e164, E164);
  }
});

test("country options list India first, then by name, with dial codes", () => {
  const list = countryOptions();
  assert.equal(list[0].code, "IN"); assert.equal(list[0].dial, "+91");
  for (const c of ["GB", "US", "CA", "AU", "AE"]) assert.ok(list.some(o => o.code === c), c);
  const rest = list.slice(1).map(o => o.name);
  assert.deepEqual(rest, [...rest].sort((a, b) => a.localeCompare(b, "en")));
});

test("masking keeps the country code and the last four digits", () => {
  assert.equal(maskPhone("+919876543210"), "+91 ••••••3210");
  assert.equal(maskPhone("+447911123456"), "+44 ••••••3456");
  assert.equal(maskPhone("garbage"), "••••");
});

test("consent wording is the spec text and the version is fixed", () => {
  assert.equal(CONSENT_VERSION, "fit-consent-2026-10-02");
  assert.equal(CONSENT_TEXT, "I agree to Gulmohar Wears keeping my name, phone number and style choices so they can help with my order. My measurement photos stay on my phone. If I choose Try on, that one photo is sent to Google's Gemini service to make the preview and is deleted afterwards. Gulmohar never stores my photos or my sizes.");
  assert.doesNotMatch(CONSENT_TEXT, /[—–]/);
});

test("phones read in international format for staff", async () => {
  const { formatPhone } = await import("./phone.ts");
  assert.equal(formatPhone("+919022564907"), "+91 90225 64907");
  assert.equal(formatPhone("+447400123456"), "+44 7400 123456");
  assert.equal(formatPhone("not a phone"), "not a phone");
});

test("numbers that only have the right length are refused (full metadata, not length checks)", async () => {
  const { parsePhone: parse } = await import("./phone-parse.ts");
  assert.equal(parse("98765 43210", "PK").ok, false);
  assert.equal(parse("98765 43210", "BD").ok, false);
  assert.deepEqual(parse("98765 43210", "IN"), { ok: true, e164: "+919876543210", country: "IN" });
  assert.deepEqual(parse("7400 12345", "GB"), { ok: false, reason: "invalid", countryName: "United Kingdom" }); // one digit short
});
