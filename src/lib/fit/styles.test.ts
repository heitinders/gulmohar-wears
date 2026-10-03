import { test } from "node:test";
import assert from "node:assert/strict";
import { STYLES, getStyle } from "./styles.ts";
import { ratioMeasures } from "./estimate.ts";
import { FIELDS } from "./measures.ts";

test("the four styles carry the prototype's ratios", () => {
  assert.deepEqual(STYLES.map(s => [s.id, s.kameezRatio, s.salwarRatio]), [
    ["punjabi", 0.45, 0.60], ["anarkali", 0.58, 0.58], ["sharara", 0.48, 0.62], ["farshi", 0.52, 0.66],
  ]);
  assert.equal(getStyle("sharara").bottomRows.map(r => r.label).join(" / "), "Sharara length / Thigh (flare start) / Knee / Flare / bottom opening");
});

test("ratioMeasures is height times RATIOS, with style kameez and salwar minus 2 cm", () => {
  const m = ratioMeasures(162.56, null, "punjabi");
  assert.equal(m.bust, 83.7);          // 162.56 * 0.515 = 83.72
  assert.equal(m.shoulder, 37.2);      // 162.56 * 0.229 = 37.23
  assert.equal(m.kameez, 73.2);        // 162.56 * 0.45
  assert.equal(m.salwar, 95.5);        // 162.56 * 0.60 - 2 = 95.54
  assert.equal(m.mode, "ratio");
  assert.equal(m.scaleMethod, "none");
  for (const f of FIELDS) assert.equal(m.sources[f], "ratio");
});

test("ratioMeasures honours a kameez override and the style ratios", () => {
  assert.equal(ratioMeasures(162.56, 90, "punjabi").kameez, 90);
  assert.equal(ratioMeasures(162.56, null, "anarkali").kameez, 94.3); // 162.56 * 0.58 = 94.28
  assert.equal(ratioMeasures(162.56, null, "farshi").salwar, 105.3);  // 162.56 * 0.66 - 2 = 105.29
});
