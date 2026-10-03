import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeDraftCode, decodeDraftCode, type DraftPayload } from "./handoff.ts";
import { ratioMeasures } from "./estimate.ts";
import { FIELDS } from "./measures.ts";

const m = ratioMeasures(162.56, null, "punjabi");
const payload: DraftPayload = { v: 1, style: "punjabi", fit: "regular", heightCm: 162.56, calibrated: false, m: Object.fromEntries(FIELDS.map(f => [f, m[f]])) as DraftPayload["m"] };

test("round trip", () => {
  const code = encodeDraftCode(payload);
  assert.match(code, /^GW1\.[A-Za-z0-9_-]+\.[a-z0-9]{4}$/);
  const d = decodeDraftCode(code);
  assert.equal(d.ok, true); if (d.ok) assert.deepEqual(d.payload, payload);
});

test("a copy and paste typo is caught by the checksum", () => {
  const code = encodeDraftCode(payload);
  const [prefix, body, sum] = code.split(".");
  const typo = `${prefix}.${body.slice(0, 10)}${body[10] === "A" ? "B" : "A"}${body.slice(11)}.${sum}`;
  assert.deepEqual(decodeDraftCode(typo), { ok: false, error: "checksum" });
});

test("wrong prefix and bad schema are refused", () => {
  assert.deepEqual(decodeDraftCode("GX1.abc.0000"), { ok: false, error: "format" });
  assert.deepEqual(decodeDraftCode("hello"), { ok: false, error: "format" });
  const bad = encodeDraftCode({ ...payload, style: "lehenga" as never });
  assert.deepEqual(decodeDraftCode(bad), { ok: false, error: "schema" });
});
