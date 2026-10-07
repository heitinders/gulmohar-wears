import {NextResponse, type NextRequest} from 'next/server';
import {studioDeps} from '@/lib/fit/server/studio-deps';
import {refreshSessionCookies} from '@/lib/fit/server/studio';
import {SESSION_COOKIES, nowSeconds, sessionCookieOptions} from '@/lib/fit/server/studio-auth';

/** Keeps studio sessions alive: renews the Supabase session shortly before it expires. Authorisation itself is checked in every page and action. */
export async function proxy(request: NextRequest) {
  const deps = studioDeps(); if (!deps) return NextResponse.next();
  const c = (name: string) => request.cookies.get(name)?.value;
  const r = await refreshSessionCookies(deps.auth, {access: c(SESSION_COOKIES.access), refresh: c(SESSION_COOKIES.refresh), expires: c(SESSION_COOKIES.expires)}, nowSeconds());
  if (!r) return NextResponse.next();
  const values: [string, string][] = 'set' in r ? [[SESSION_COOKIES.access, r.set.accessToken], [SESSION_COOKIES.refresh, r.set.refreshToken], [SESSION_COOKIES.expires, String(r.set.expiresAt)]] : [];
  // The page rendering this same request must see the new cookies too, so they are written to the request as well.
  for (const name of Object.values(SESSION_COOKIES)) request.cookies.delete(name);
  for (const [name, value] of values) request.cookies.set(name, value);
  const response = NextResponse.next({request});
  const options = sessionCookieOptions(process.env.NODE_ENV === 'production');
  if ('set' in r) for (const [name, value] of values) response.cookies.set(name, value, options);
  else for (const name of Object.values(SESSION_COOKIES)) response.cookies.set(name, '', {...options, maxAge: 0});
  return response;
}

export const config = {matcher: ['/studio/:path*', '/api/fit/try-on/:path*']};
