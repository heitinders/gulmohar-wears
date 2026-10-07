import type {Metadata} from 'next';
import {connection} from 'next/server';
import {BrandMark} from '@/components/brand-mark';
import {LoginForm} from '@/components/studio/login-form';
import {fitBackend} from '@/lib/fit/server/config';

export const metadata: Metadata = {title: 'Sign in'};
const REASONS: Record<string, string> = {'not-staff': 'This account is not on the studio list.', unavailable: 'The studio cannot reach its database just now. Try again shortly.'};

export default async function Login({searchParams}: {searchParams: Promise<{reason?: string}>}) {
  await connection();
  const reason = (await searchParams).reason;
  const off = fitBackend() === 'off';
  return <main id="main" className="studio-login">
    <BrandMark compact eager/>
    <p className="eyebrow">GULMOHAR STUDIO</p>
    <h1>Sign in</h1>
    {off ? <p className="fit-error">The studio is not connected yet. Ask for the Supabase project to be set up first.</p> : <LoginForm initialError={reason ? REASONS[reason] ?? null : null}/>}
  </main>;
}
