import { needsRefresh, type Session, type StudioAuth, type StudioData, type StudioUser } from "./studio-auth.ts";

export type StaffCheck = { ok: true; user: StudioUser; accessToken: string } | { ok: false; reason: "signed-out" | "not-staff" | "unavailable" };

/** Every studio page and action starts here. Staff membership is read through RLS as the user, not with the service role. */
export async function requireStaff(deps: { auth: StudioAuth; studioData(accessToken: string): StudioData }, cookies: { access?: string }): Promise<StaffCheck> {
  const accessToken = cookies.access;
  if (!accessToken) return { ok: false, reason: "signed-out" };
  try {
    const user = await deps.auth.getUser(accessToken);
    if (!user) return { ok: false, reason: "signed-out" };
    if (!(await deps.studioData(accessToken).isStaff(user.id))) return { ok: false, reason: "not-staff" };
    return { ok: true, user, accessToken };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Used by proxy.ts: renew the session shortly before it expires. A rejected refresh token signs the person out. */
export async function refreshSessionCookies(auth: StudioAuth, cookies: { access?: string; refresh?: string; expires?: string }, nowSec: number): Promise<{ set: Session } | { clear: true } | null> {
  if (!cookies.refresh) return null;
  if (!needsRefresh(Number(cookies.expires), nowSec)) return null;
  try {
    const session = await auth.refresh(cookies.refresh);
    return session ? { set: session } : { clear: true };
  } catch {
    return null;
  }
}
