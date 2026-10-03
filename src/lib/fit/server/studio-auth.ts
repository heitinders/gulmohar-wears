import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { ClientRow, MemoryState } from "./store.ts";

/** expiresAt is in seconds since the epoch, as Supabase Auth reports it. */
export interface Session { accessToken: string; refreshToken: string; expiresAt: number }
export interface StudioUser { id: string; email: string }
export interface StudioAuth {
  signIn(email: string, password: string): Promise<{ ok: true; session: Session } | { ok: false }>;
  getUser(accessToken: string): Promise<StudioUser | null>;
  refresh(refreshToken: string): Promise<Session | null>;
  signOut(accessToken: string): Promise<void>;
}
/** What a signed-in staff member may see. Supabase enforces this with RLS; the memory version copies the policies. */
export interface StudioData {
  isStaff(userId: string): Promise<boolean>;
  listClients(): Promise<ClientRow[]>;
  deleteClient(id: string): Promise<boolean>;
}

export const SESSION_COOKIES = { access: "gw_studio_at", refresh: "gw_studio_rt", expires: "gw_studio_exp" } as const;
export const sessionCookieOptions = (secure: boolean) => ({ httpOnly: true, sameSite: "lax" as const, path: "/", secure, maxAge: 60 * 60 * 24 * 7 });
export const needsRefresh = (expiresAt: number, nowSec: number) => !Number.isFinite(expiresAt) || expiresAt - nowSec <= 60;
export const nowSeconds = () => Math.floor(Date.now() / 1000);

const SESSION_SECONDS = 3600;
const token = () => randomBytes(24).toString("base64url");
const sameText = (a: string, b: string) => { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export interface MemoryUser { email: string; password: string; staff: boolean }
type MemoryAuth = StudioAuth & { staffIds: Set<string> };

/** Development and test sign-in. Users come from STUDIO_DEV_EMAIL and STUDIO_DEV_PASSWORD; never used in production. */
export function createMemoryAuth(users: MemoryUser[], now: () => number = nowSeconds): MemoryAuth {
  const accounts = users.map(u => ({ ...u, email: u.email.trim().toLowerCase(), id: randomUUID() }));
  const access = new Map<string, { userId: string; expiresAt: number }>();
  const refresh = new Map<string, string>();
  const issue = (userId: string): Session => {
    const s = { accessToken: token(), refreshToken: token(), expiresAt: now() + SESSION_SECONDS };
    access.set(s.accessToken, { userId, expiresAt: s.expiresAt }); refresh.set(s.refreshToken, userId); return s;
  };
  return {
    staffIds: new Set(accounts.filter(a => a.staff).map(a => a.id)),
    async signIn(email, password) {
      const a = accounts.find(x => x.email === email.trim().toLowerCase());
      if (!a || !sameText(a.password, password)) return { ok: false };
      return { ok: true, session: issue(a.id) };
    },
    async getUser(accessToken) {
      const s = access.get(accessToken); if (!s || s.expiresAt <= now()) return null;
      const a = accounts.find(x => x.id === s.userId); return a ? { id: a.id, email: a.email } : null;
    },
    async refresh(refreshToken) {
      const userId = refresh.get(refreshToken); if (!userId) return null;
      refresh.delete(refreshToken); return issue(userId);
    },
    async signOut(accessToken) {
      const s = access.get(accessToken); access.delete(accessToken);
      if (s) for (const [r, u] of refresh) if (u === s.userId) refresh.delete(r);
    },
  };
}

export function createMemoryStudioData(auth: MemoryAuth, state: MemoryState, accessToken: string): StudioData {
  const caller = async () => { const u = await auth.getUser(accessToken); return u && auth.staffIds.has(u.id) ? u : null; };
  return {
    async isStaff(userId) { const u = await auth.getUser(accessToken); return !!u && u.id === userId && auth.staffIds.has(userId); },
    async listClients() { if (!(await caller())) return []; return [...state.clients.values()].map(r => structuredClone(r)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); },
    async deleteClient(id) { if (!(await caller())) return false; return state.clients.delete(id); },
  };
}
