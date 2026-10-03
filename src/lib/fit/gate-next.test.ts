import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./gate-next.ts";

test("only the gated fit pages are allowed as the next stop", () => {
  assert.equal(safeNext("/fit/measure"), "/fit/measure");
  assert.equal(safeNext("/fit/profile"), "/fit/profile");
  assert.equal(safeNext("/fit/try-on"), "/fit/try-on");
  assert.equal(safeNext("/fit/measure?step=result&profile=fit_abc"), "/fit/measure?step=result&profile=fit_abc");
});

test("anything else falls back to measuring", () => {
  for (const bad of [undefined, "", "https://evil.example/fit/measure", "//evil.example", "/\\evil.example", "/fit/start", "/studio", "/fit/../studio", "javascript:alert(1)", ["/fit/profile"], "/fit/measure\n"]) {
    assert.equal(safeNext(bad as never), "/fit/measure", String(bad));
  }
});
