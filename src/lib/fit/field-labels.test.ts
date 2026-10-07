import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldRows } from "./field-labels.ts";
import { FIELDS } from "./measures.ts";

test("every style lists each field once, upper body first, with the style's own names", () => {
  for (const style of ["punjabi", "anarkali", "sharara", "farshi"] as const) {
    const rows = fieldRows(style);
    assert.equal(rows[0][1], "Bust");
    assert.equal(new Set(rows.map(r => r[0])).size, rows.length, style);
    for (const [k] of rows) assert.ok(FIELDS.includes(k), k);
  }
  assert.ok(fieldRows("anarkali").some(([k, l]) => k === "kameez" && /Anarkali/.test(l)));
  assert.ok(fieldRows("punjabi").every(([, l]) => !l.includes(" / ")));
});
