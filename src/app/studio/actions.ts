'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {studioDeps} from '@/lib/fit/server/studio-deps';
import {requireStaff} from '@/lib/fit/server/studio';
import {SESSION_COOKIES} from '@/lib/fit/server/studio-auth';
import {clearSession, writeSession} from './session';

export type SignInResult = {ok: true} | {ok: false; error: 'credentials' | 'not-staff' | 'unavailable' | 'off'};

export async function studioSignIn(input: {email: string; password: string}): Promise<SignInResult> {
  const deps = studioDeps(); if (!deps) return {ok: false, error: 'off'};
  const email = typeof input?.email === 'string' ? input.email.slice(0, 200) : '';
  const password = typeof input?.password === 'string' ? input.password.slice(0, 200) : '';
  if (!email || !password) return {ok: false, error: 'credentials'};
  try {
    const r = await deps.auth.signIn(email, password);
    if (!r.ok) return {ok: false, error: 'credentials'};
    const staff = await requireStaff(deps, {access: r.session.accessToken});
    if (!staff.ok) { await deps.auth.signOut(r.session.accessToken); return {ok: false, error: staff.reason === 'unavailable' ? 'unavailable' : 'not-staff'}; }
    await writeSession(r.session);
    return {ok: true};
  } catch {
    return {ok: false, error: 'unavailable'};
  }
}

export async function studioSignOut() {
  const deps = studioDeps(); const access = (await cookies()).get(SESSION_COOKIES.access)?.value;
  if (deps && access) await deps.auth.signOut(access).catch(() => {});
  await clearSession();
  redirect('/studio/login');
}
