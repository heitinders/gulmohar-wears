import { test } from "node:test";
import assert from "node:assert/strict";
import { inchesText, parseTapeInches } from "./tailor.ts";

test("a tape value in inches becomes cm", () => {
  assert.deepEqual(parseTapeInches("34.5"), { ok: true, cm: 87.63 });
  assert.deepEqual(parseTapeInches(" 34 "), { ok: true, cm: 86.36 });
  assert.deepEqual(parseTapeInches("34,5"), { ok: true, cm: 87.63 });
});

test("blank means no correction, junk and out of range are refused", () => {
  assert.deepEqual(parseTapeInches(""), { ok: true, cm: null });
  for (const bad of ["abc", "3.9", "80.1", "340", "-5", "Infinity", "1e2"]) assert.deepEqual(parseTapeInches(bad), { ok: false }, bad);
  assert.equal(parseTapeInches("4").ok, true); assert.equal(parseTapeInches("80").ok, true);
});

test("cm read back as tidy inches", () => {
  assert.equal(inchesText(87.63), "34.5"); assert.equal(inchesText(86.36), "34"); assert.equal(inchesText(86.995), "34.25");
});
