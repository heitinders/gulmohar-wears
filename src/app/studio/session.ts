import 'server-only';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {studioDeps} from '@/lib/fit/server/studio-deps';
import {requireStaff} from '@/lib/fit/server/studio';
import {SESSION_COOKIES, sessionCookieOptions, type Session} from '@/lib/fit/server/studio-auth';

const secure = () => process.env.NODE_ENV === 'production';

/** For studio pages and actions: the staff member, or a redirect to the login page with the reason. */
export async function staffOrRedirect() {
  const deps = studioDeps(); if (!deps) redirect('/studio/login');
  const jar = await cookies();
  const r = await requireStaff(deps, {access: jar.get(SESSION_COOKIES.access)?.value});
  if (!r.ok) redirect(r.reason === 'signed-out' ? '/studio/login' : `/studio/login?reason=${r.reason}`);
  return {...r, deps};
}

export async function writeSession(s: Session) {
  const jar = await cookies(); const o = sessionCookieOptions(secure());
  jar.set(SESSION_COOKIES.access, s.accessToken, o); jar.set(SESSION_COOKIES.refresh, s.refreshToken, o); jar.set(SESSION_COOKIES.expires, String(s.expiresAt), o);
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of Object.values(SESSION_COOKIES)) jar.delete({name, path: '/'});
}
