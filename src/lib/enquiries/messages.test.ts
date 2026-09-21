import test from "node:test";
import assert from "node:assert/strict";
import { composeEnquiry, whatsappUrl } from "./messages.ts";

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
