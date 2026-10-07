import { test } from "node:test";
import assert from "node:assert/strict";
import { signClientToken, verifyClientToken } from "./token.ts";

const ID = "6f1c2a7e-3b4d-4c5e-8f90-123456789abc";
const SECRET = "a-long-test-secret-that-is-not-real";

test("a signed token verifies and returns the client id", () => {
  const token = signClientToken(ID, SECRET);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(verifyClientToken(token, SECRET), { ok: true, clientId: ID });
});

test("changing one character of either half fails", () => {
  const token = signClientToken(ID, SECRET);
  const [a, b] = token.split(".");
  const flip = (s: string, i: number) => s.slice(0, i) + (s[i] === "A" ? "B" : "A") + s.slice(i + 1);
  assert.deepEqual(verifyClientToken(`${flip(a, 3)}.${b}`, SECRET), { ok: false });
  assert.deepEqual(verifyClientToken(`${a}.${flip(b, 5)}`, SECRET), { ok: false });
});

test("a token signed with another secret fails", () => {
  assert.deepEqual(verifyClientToken(signClientToken(ID, "old-secret-value"), SECRET), { ok: false });
});

test("junk never throws", () => {
  for (const junk of [undefined, null, 42, {}, "", ".", "a.b.c", "abc", "x".repeat(10_000), `${"a".repeat(5000)}.${"b".repeat(5000)}`]) {
    assert.deepEqual(verifyClientToken(junk, SECRET), { ok: false }, String(junk).slice(0, 20));
  }
});

test("a valid signature over something that is not a uuid fails", () => {
  const forged = signClientToken("not-a-uuid", SECRET);
  assert.deepEqual(verifyClientToken(forged, SECRET), { ok: false });
});

test("signing refuses an empty or short secret", () => {
  assert.throws(() => signClientToken(ID, ""));
  assert.throws(() => signClientToken(ID, "short"));
  assert.deepEqual(verifyClientToken(signClientToken(ID, SECRET), ""), { ok: false });
});
