import { test } from "node:test";
import assert from "node:assert/strict";
import { CM_PER_IN, round1, cmToIn, inToCm, formatIn, formatCm } from "./units.ts";

test("constants and conversions match the prototype", () => {
  assert.equal(CM_PER_IN, 2.54);
  assert.equal(round1(84.449), 84.4);
  assert.equal(round1(84.45), 84.5);
  assert.equal(inToCm(64), 162.56);
  assert.equal(round1(cmToIn(162.56)), 64);
});

test("formatIn rounds to the nearest quarter inch with fraction glyphs", () => {
  assert.equal(formatIn(84.5), "33¼ in");   // 33.27 in
  assert.equal(formatIn(162.56), "64 in");
  assert.equal(formatIn(91.44 + 1.27), "36½ in"); // 36.5 in exactly
  assert.equal(formatIn(93.98), "37 in");   // 37.0 in
  assert.equal(formatIn(96.2), "37¾ in");   // 37.87 in
});

test("formatCm rounds to the nearest half centimetre", () => {
  assert.equal(formatCm(84.449), "84.5 cm");
  assert.equal(formatCm(84.2), "84 cm");
  assert.equal(formatCm(84.76), "85 cm");
});
