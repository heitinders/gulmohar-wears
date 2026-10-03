import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ClientRow, FitStore } from "./store.ts";
import type { Session, StudioAuth, StudioData } from "./studio-auth.ts";
import type { PreferencePatch } from "../preference-sync.ts";

// Thin adapters over supabase-js. Errors are rethrown as plain messages without request bodies,
// so nothing a customer typed can reach a log through them.

interface DbRow { id: string; phone_e164: string; name: string; consent_at: string; consent_version: string; style: ClientRow["style"]; fit: ClientRow["fit"]; sleeve: string | null; neckline: string | null; length_note: string | null; brief: ClientRow["brief"]; source?: string; created_at: string; updated_at: string }

export const fromDbRow = (r: DbRow): ClientRow => ({ id: r.id, phone: r.phone_e164, name: r.name, consentAt: r.consent_at, consentVersion: r.consent_version, style: r.style, fit: r.fit, sleeve: r.sleeve, neckline: r.neckline, lengthNote: r.length_note, brief: r.brief, createdAt: r.created_at, updatedAt: r.updated_at });

export function toDbPatch(p: PreferencePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.style !== undefined) out.style = p.style;
  if (p.fit !== undefined) out.fit = p.fit;
  if (p.sleeve !== undefined) out.sleeve = p.sleeve;
  if (p.neckline !== undefined) out.neckline = p.neckline;
  if (p.lengthNote !== undefined) out.length_note = p.lengthNote;
  if (p.brief !== undefined) out.brief = p.brief;
  return out;
}

const COLUMNS = "id, phone_e164, name, consent_at, consent_version, style, fit, sleeve, neckline, length_note, brief, created_at, updated_at";
const fail = (what: string, error: { code?: string } | null): never => { throw new Error(`supabase ${what} failed${error?.code ? ` (${error.code})` : ""}`); };
const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Service-role access for customer code paths. Only server modules import this. */
export function createSupabaseStore(url: string, serviceKey: string): FitStore {
  const db: SupabaseClient = createClient(url, serviceKey, noSession);
  return {
    async upsertClient(i) {
      const { data, error } = await db.from("fit_clients").upsert({ phone_e164: i.phone, name: i.name, consent_at: i.consentAt, consent_version: i.consentVersion }, { onConflict: "phone_e164" }).select("id, phone_e164").single();
      if (error || !data) return fail("upsert", error);
      return { id: data.id, phone: data.phone_e164 };
    },
    async getClient(id) {
      const { data, error } = await db.from("fit_clients").select(COLUMNS).eq("id", id).maybeSingle();
      if (error) return fail("read", error);
      return data ? fromDbRow(data as DbRow) : null;
    },
    async updatePreference(id, patch) {
      const values = toDbPatch(patch); if (!Object.keys(values).length) return true;
      const { data, error } = await db.from("fit_clients").update(values).eq("id", id).select("id");
      if (error) return fail("update", error);
      return (data?.length ?? 0) > 0;
    },
    async getUsage(key, day) {
      const { data, error } = await db.from("fit_usage").select("tryons, reports").eq("phone_e164", key).eq("day", day).maybeSingle();
      if (error) return fail("usage", error);
      return { tryons: data?.tryons ?? 0, reports: data?.reports ?? 0 };
    },
    async bumpUsage(key, day, field) {
      const { data, error } = await db.rpc("fit_bump_usage", { p_key: key, p_day: day, p_field: field });
      if (error || typeof data !== "number") return fail("bump", error);
      return data;
    },
  };
}

/** Studio reads and deletes run as the signed-in staff member, so the RLS policies decide what comes back. */
export function createSupabaseStudioData(url: string, anonKey: string, accessToken: string): StudioData {
  const db = createClient(url, anonKey, { ...noSession, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  return {
    async isStaff(userId) {
      const { data, error } = await db.from("studio_staff").select("user_id").eq("user_id", userId).maybeSingle();
      if (error) return fail("staff", error);
      return !!data;
    },
    async listClients() {
      const { data, error } = await db.from("fit_clients").select(COLUMNS).order("updated_at", { ascending: false }).limit(1000);
      if (error) return fail("clients", error);
      return (data as DbRow[]).map(fromDbRow);
    },
    async deleteClient(id) {
      const { data, error } = await db.from("fit_clients").delete().eq("id", id).select("id");
      if (error) return fail("delete", error);
      return (data?.length ?? 0) > 0;
    },
  };
}

const toSession = (s: { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number }): Session =>
  ({ accessToken: s.access_token, refreshToken: s.refresh_token, expiresAt: s.expires_at ?? Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600) });

export function createSupabaseAuth(url: string, anonKey: string): StudioAuth {
  const client = () => createClient(url, anonKey, noSession);
  return {
    async signIn(email, password) {
      const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password });
      return error || !data.session ? { ok: false } : { ok: true, session: toSession(data.session) };
    },
    async getUser(accessToken) {
      if (!accessToken) return null;
      const { data, error } = await client().auth.getUser(accessToken);
      return error || !data.user ? null : { id: data.user.id, email: data.user.email ?? "" };
    },
    async refresh(refreshToken) {
      if (!refreshToken) return null;
      const { data, error } = await client().auth.refreshSession({ refresh_token: refreshToken });
      return error || !data.session ? null : toSession(data.session);
    },
    async signOut(accessToken) {
      try { await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } }); } catch { /* the cookies are cleared either way */ }
    },
  };
}
