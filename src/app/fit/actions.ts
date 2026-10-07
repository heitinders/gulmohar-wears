'use server';
import {headers} from 'next/headers';
import {fitDeps} from '@/lib/fit/server/deps';
import {checkClient, registerClient, type CheckResult, type RegisterResult} from '@/lib/fit/server/register';
import {updatePreference} from '@/lib/fit/server/preference';

// Server Functions are reachable by direct POST, so each one validates everything it is given.

async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim() || 'unknown';
}

export async function registerFitClient(input: {name: string; phone: string; country: string; consent: boolean; consentVersion: string; website: string}): Promise<RegisterResult> {
  const deps = fitDeps(); if (!deps) return {ok: false, error: 'unavailable'};
  const i = (input ?? {}) as Partial<typeof input>;
  return registerClient(deps, {name: i.name, phone: i.phone, country: i.country, consent: i.consent, consentVersion: i.consentVersion, website: i.website, ip: await clientIp()});
}

export async function checkFitToken(token: string): Promise<CheckResult> {
  const deps = fitDeps(); if (!deps) return {ok: false, error: 'unavailable'};
  return checkClient(deps, token);
}

export async function syncFitPreference(token: string, patch: unknown): Promise<{ok: true} | {ok: false; error: 'invalid-token' | 'unavailable'}> {
  const deps = fitDeps(); if (!deps) return {ok: false, error: 'unavailable'};
  return updatePreference(deps, token, patch);
}
