'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {studioSignIn} from '@/app/studio/actions';

const MESSAGES = {credentials: 'Email or password is not right.', 'not-staff': 'This account is not on the studio list.', unavailable: 'The studio cannot reach its database just now. Try again shortly.', off: 'The studio is not connected yet.'};

export function LoginForm({initialError}: {initialError: string | null}) {
  const router = useRouter();
  const [error, setError] = useState(initialError); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      const r = await studioSignIn({email: String(data.get('email') ?? ''), password: String(data.get('password') ?? '')});
      if (r.ok) { router.replace('/studio'); router.refresh(); return; }
      setError(MESSAGES[r.error]);
    } catch { setError(MESSAGES.unavailable); }
    setBusy(false);
  }
  return <form className="fit-form" onSubmit={submit}>
    <div className="fit-field"><label htmlFor="studio-email">Email</label><input id="studio-email" name="email" type="email" autoComplete="username" required/></div>
    <div className="fit-field"><label htmlFor="studio-password">Password</label><input id="studio-password" name="password" type="password" autoComplete="current-password" required/></div>
    <p className="fit-error" role="alert" hidden={!error}>{error}</p>
    <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
  </form>;
}
