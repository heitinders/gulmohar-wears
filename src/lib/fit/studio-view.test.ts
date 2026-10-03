import { test } from "node:test";
import assert from "node:assert/strict";
import { briefSummary, listOrders, waLink } from "./studio-view.ts";
import type { ClientRow } from "./server/store.ts";

const row = (over: Partial<ClientRow>): ClientRow => ({ id: "x", phone: "+919876543210", name: "A", consentAt: "c", consentVersion: "v", style: null, fit: null, sleeve: null, neckline: null, lengthNote: null, brief: null, createdAt: "1", updatedAt: "2", ...over });

test("orders keep clients with any brief value, soonest deadline first, no deadline last", () => {
  const rows = [
    row({ id: "none" }),
    row({ id: "empty", brief: {} }),
    row({ id: "late", brief: { deadline: "2026-12-20" } }),
    row({ id: "nodate", brief: { city: "Leeds" } }),
    row({ id: "soon", brief: { deadline: "2026-11-01", fabric: "silk" } }),
  ];
  assert.deepEqual(listOrders(rows).map(r => r.id), ["soon", "late", "nodate"]);
});

test("whatsapp links use only the digits of the phone", () => {
  assert.equal(waLink("+919876543210"), "https://wa.me/919876543210");
  assert.equal(waLink("+44 7400 123456"), "https://wa.me/447400123456");
});

test("a brief reads as one line in a fixed order", () => {
  assert.equal(briefSummary({ city: "Leeds", occasion: "Wedding", fabric: "Silk", deadline: "2026-12-01" }), "Wedding, Silk, Leeds, by 1 Dec 2026");
  assert.equal(briefSummary(null), "");
  assert.equal(briefSummary({ deadline: "2026-12-01" }), "by 1 Dec 2026");
});
