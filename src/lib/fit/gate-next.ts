const ALLOWED = /^\/fit\/(measure|profile|try-on)(\?[A-Za-z0-9=&_%.-]*)?$/;

/** Where the gate may send the customer afterwards. Only the gated fit pages, never another site (no open redirect). */
export function safeNext(value: unknown): string {
  return typeof value === "string" && ALLOWED.test(value) ? value : "/fit/measure";
}
