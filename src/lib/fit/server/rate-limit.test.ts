import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "./rate-limit.ts";

test("allows the limit, refuses the next, and resets after the window", () => {
  let now = 0;
  const l = createRateLimiter({ limit: 3, windowMs: 1000, now: () => now });
  assert.deepEqual([l.take("ip"), l.take("ip"), l.take("ip"), l.take("ip")], [true, true, true, false]);
  assert.equal(l.take("other"), true);
  now = 999; assert.equal(l.take("ip"), false);
  now = 1000; assert.equal(l.take("ip"), true);
});

test("old keys are forgotten so memory stays bounded", () => {
  let now = 0;
  const l = createRateLimiter({ limit: 1, windowMs: 10, now: () => now, maxKeys: 100 });
  for (let i = 0; i < 1000; i++) l.take(`k${i}`);
  assert.ok(l.size() <= 100);
  now = 20; l.take("fresh"); assert.ok(l.size() <= 100);
});
