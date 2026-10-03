import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHeight, parseKameezIn, HEIGHT_MIN_IN, HEIGHT_MAX_IN, KAMEEZ_MIN_IN, KAMEEZ_MAX_IN } from "./length-input.ts";

test("height range matches the prototype, 47 to 87 in", () => {
  assert.equal(HEIGHT_MIN_IN, 47);
  assert.equal(HEIGHT_MAX_IN, 87);
});

test("parseHeight reads inches and reports cm", () => {
  assert.deepEqual(parseHeight("64", "in"), { ok: true, cm: 162.56 });
  assert.deepEqual(parseHeight(" 47 ", "in"), { ok: true, cm: 119.38 });
  assert.deepEqual(parseHeight("87", "in"), { ok: true, cm: 220.98 });
  assert.equal(parseHeight("64,5", "in").ok, true);
});

test("parseHeight reads centimetres as given", () => {
  assert.deepEqual(parseHeight("163", "cm"), { ok: true, cm: 163 });
  assert.deepEqual(parseHeight("64", "cm"), { ok: false, reason: "range" });
});

test("parseHeight tells an empty field from a wrong number", () => {
  assert.deepEqual(parseHeight("", "in"), { ok: false, reason: "empty" });
  assert.deepEqual(parseHeight("   ", "cm"), { ok: false, reason: "empty" });
  assert.deepEqual(parseHeight("640", "in"), { ok: false, reason: "range" });
  assert.deepEqual(parseHeight("46.9", "in"), { ok: false, reason: "range" });
  assert.deepEqual(parseHeight("87.1", "in"), { ok: false, reason: "range" });
  assert.deepEqual(parseHeight("tall", "in"), { ok: false, reason: "range" });
});

test("kameez length accepts 20 to 63 in and reports cm", () => {
  assert.equal(KAMEEZ_MIN_IN, 20);
  assert.equal(KAMEEZ_MAX_IN, 63);
  assert.deepEqual(parseKameezIn("35"), { ok: true, cm: 88.9 });
  assert.deepEqual(parseKameezIn("20"), { ok: true, cm: 50.8 });
  assert.deepEqual(parseKameezIn("63"), { ok: true, cm: 160.02 });
  assert.deepEqual(parseKameezIn("35.5"), { ok: true, cm: 90.17 });
});

test("a partly typed kameez length is out of range, not lost", () => {
  // The field keeps its own text, so '3' on the way to '35' stays on screen.
  assert.deepEqual(parseKameezIn("3"), { ok: false, reason: "range" });
  assert.deepEqual(parseKameezIn("63.5"), { ok: false, reason: "range" });
  assert.deepEqual(parseKameezIn(""), { ok: false, reason: "empty" });
});
