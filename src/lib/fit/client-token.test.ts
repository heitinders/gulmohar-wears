import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENT_KEY, PENDING_KEY, TOKEN_KEY, createClientTokenStore } from "./client-token.ts";
import type { StorageLike } from "./device-store.ts";

const memory = (): StorageLike & { map: Map<string, string> } => { const map = new Map<string, string>(); return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: k => { map.delete(k); } }; };
const throwing: StorageLike = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("denied"); } };

test("keys are the ones the spec names", () => {
  assert.equal(TOKEN_KEY, "gulmohar_fit_token_v1");
  assert.equal(CLIENT_KEY, "gulmohar_fit_client_v1");
  assert.equal(PENDING_KEY, "gulmohar_fit_pending_pref_v1");
});

test("stores the token with who it belongs to, and clears both", () => {
  const m = memory(); const s = createClientTokenStore(m);
  assert.equal(s.get(), null); assert.equal(s.who(), null);
  assert.equal(s.set("tok.sig", { name: "Simran", phoneMasked: "+91 ••••••3210" }), true);
  assert.equal(s.get(), "tok.sig"); assert.deepEqual(s.who(), { name: "Simran", phoneMasked: "+91 ••••••3210" });
  s.clear(); assert.equal(s.get(), null); assert.equal(s.who(), null);
});

test("a pending preference waits for the next visit, then clears", () => {
  const s = createClientTokenStore(memory());
  assert.equal(s.pendingPreference(), null);
  s.setPendingPreference({ fit: "relaxed", brief: { city: "Leeds" } });
  assert.deepEqual(s.pendingPreference(), { fit: "relaxed", brief: { city: "Leeds" } });
  s.clearPending(); assert.equal(s.pendingPreference(), null);
});

test("a pending preference never keeps fields outside the whitelist", () => {
  const m = memory(); const s = createClientTokenStore(m);
  s.setPendingPreference({ fit: "fitted", measures: { bust: 86 } } as never);
  assert.doesNotMatch(m.map.get(PENDING_KEY) ?? "", /bust|86/);
});

test("broken storage never throws and reports failure", () => {
  const s = createClientTokenStore(throwing);
  assert.equal(s.get(), null); assert.equal(s.who(), null); assert.equal(s.pendingPreference(), null);
  assert.equal(s.set("t", { name: "a", phoneMasked: "b" }), false);
  assert.doesNotThrow(() => { s.clear(); s.setPendingPreference({ fit: "fitted" }); s.clearPending(); });
  const none = createClientTokenStore(null);
  assert.equal(none.get(), null); assert.equal(none.set("t", { name: "a", phoneMasked: "b" }), false);
});

test("corrupt saved values read as empty", () => {
  const m = memory(); m.map.set(CLIENT_KEY, "{not json"); m.map.set(PENDING_KEY, "[1,2]");
  const s = createClientTokenStore(m);
  assert.equal(s.who(), null); assert.equal(s.pendingPreference(), null);
});
