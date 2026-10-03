import test from "node:test";
import assert from "node:assert/strict";
import { composeEnquiry, composeMeasurementDraft, composeOrderBrief, whatsappUrl } from "./messages.ts";
import { ratioMeasures } from "../fit/estimate.ts";
import { recommendSize } from "../fit/size-advice.ts";
import { defaultPreference } from "../fit/fit-preference.ts";

test("WhatsApp handoff preserves Unicode, ampersands and line breaks", () => {
  const message = composeEnquiry({ version: 1, name: " Simran ", occasion: "Wedding & reception", notes: "ਗੁਲਮੋਹਰ, silk + organza", source: "styleguide" });
  const url = new URL(whatsappUrl(message));
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.pathname, "/918699841800");
  assert.equal(url.searchParams.get("text"), message);
  assert.match(message, /Simran/);
  assert.match(message, /ਗੁਲਮੋਹਰ, silk \+ organza/);
});

test("Blank optional details are omitted and input cannot introduce false fields", () => {
  const message = composeEnquiry({ version: 1, name: "A\nB", occasion: "Celebration", notes: "  ", source: "styleguide" });
  assert.ok(!message.includes("undefined"));
  assert.ok(!message.includes("Notes:"));
  assert.ok(!message.includes("Event date:"));
  assert.match(message, /I’m A B\./);
});

const measures = ratioMeasures(162.56, null, "punjabi");
const draftInput = { name: "Simran", styleId: "punjabi" as const, preference: defaultPreference, heightCm: 162.56, measures, confidence: Object.fromEntries(Object.keys(measures.sources).map(k => [k, 48])) as Record<string, number>, calibration: null, advice: recommendSize(measures, "regular"), date: new Date("2026-10-03T12:00:00+05:30"), code: "GW1.abc.0000" };

test("the measurement draft is readable, inches first, with the DRAFT code last", () => {
  const text = composeMeasurementDraft(draftInput);
  const lines = text.split("\n");
  assert.equal(lines[0], "Gulmohar Wears, measurement DRAFT");
  assert.ok(lines.includes("Name: Simran"));
  assert.ok(lines.includes("Height: 64 in (162.5 cm)"));
  assert.ok(lines.includes("Photos: height only"));
  assert.ok(lines.includes("Bust: 33 in (83.5 cm), draft, confidence 48%"));
  assert.ok(lines.includes("Calibration: none yet. One tape measure of the bust or waist brings the girths much closer."));
  assert.equal(lines.at(-1), "Draft code: GW1.abc.0000");
  assert.doesNotMatch(text, /[—–]/);
});

test("the order brief lists fabric, occasion, city, deadline and notes", () => {
  const text = composeOrderBrief({ ...draftInput, brief: { fabric: "Silk", occasion: "Wedding", city: "Toronto", deadline: "2026-12-10", notes: "Boat neck" } });
  assert.equal(text.split("\n")[0], "Gulmohar Wears, order brief DRAFT");
  assert.ok(text.includes("Fabric preference: Silk"));
  assert.ok(text.includes("Deadline: 10 Dec 2026"));
  assert.ok(text.includes("Notes: Boat neck"));
  assert.doesNotMatch(text, /[—–]/);
});

test("a try-on order names the look, the choice and that the preview was AI, with no measurements", async () => {
  const { composeTryOnOrder } = await import("./messages.ts");
  const { looks } = await import("../catalogue.ts");
  const ready = composeTryOnOrder({ name: "Simran", look: looks[0], choice: "size", size: "M" });
  assert.match(ready, /Simran/); assert.match(ready, /Olive-gold embroidered suit/); assert.match(ready, /Ready size: M/); assert.match(ready, /AI preview/);
  assert.doesNotMatch(ready, /[—–]/); assert.doesNotMatch(ready, /bust|waist|cm\b/i);
  const mtm = composeTryOnOrder({ name: "", look: looks[1], choice: "mtm" });
  assert.match(mtm, /Made to measure/); assert.match(mtm, /Fuchsia/); assert.doesNotMatch(mtm, /I’m ,/);
  assert.match(composeTryOnOrder({ name: "A", look: looks[2], choice: "size", size: "" }), /Ready size: help me choose/);
});
