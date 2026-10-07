import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../../next.config.ts";

test("server function arguments (names, phones, tokens) are never printed by the dev server", () => {
  assert.equal(config.logging && config.logging.serverFunctions, false);
});

test("the try-on route ships with the catalogue photos it reads", () => {
  assert.deepEqual(config.outputFileTracingIncludes?.["/api/fit/try-on"], ["./public/media/*-1600.jpg"]);
});
