import { createHmac, timingSafeEqual } from "node:crypto";

// token = base64url(client_id) + "." + base64url(HMAC_SHA256(FIT_TOKEN_SECRET, client_id)), spec 4.4.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_SECRET = 16;
const MAX_TOKEN = 200;

const mac = (clientId: string, secret: string) => createHmac("sha256", secret).update(clientId).digest();

export function signClientToken(clientId: string, secret: string): string {
  if (!secret || secret.length < MIN_SECRET) throw new Error("FIT_TOKEN_SECRET is missing or too short");
  return `${Buffer.from(clientId).toString("base64url")}.${mac(clientId, secret).toString("base64url")}`;
}

export function verifyClientToken(token: unknown, secret: string): { ok: true; clientId: string } | { ok: false } {
  if (typeof token !== "string" || token.length > MAX_TOKEN || !secret || secret.length < MIN_SECRET) return { ok: false };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false };
  const clientId = Buffer.from(parts[0], "base64url").toString("utf8");
  if (!UUID.test(clientId)) return { ok: false };
  const given = Buffer.from(parts[1], "base64url");
  const expected = mac(clientId, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false };
  return { ok: true, clientId };
}
