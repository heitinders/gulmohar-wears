import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin } from "./image.ts";

test("long edge capped at 1600, aspect kept, never enlarged", () => {
  assert.deepEqual(fitWithin(4000, 6000, 1600), { width: 1067, height: 1600 });
  assert.deepEqual(fitWithin(6000, 4000, 1600), { width: 1600, height: 1067 });
  assert.deepEqual(fitWithin(800, 1200, 1600), { width: 800, height: 1200 });
  assert.deepEqual(fitWithin(0, 0, 1600), { width: 0, height: 0 });
});
