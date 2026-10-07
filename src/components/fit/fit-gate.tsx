'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {browserClientTokenStore} from '@/lib/fit/client-token';
import {checkFitToken, syncFitPreference} from '@/app/fit/actions';

/**
 * Sends a phone without a gate token to /fit/start (spec 4.1). The token lives in localStorage, so this runs in the
 * browser. A token the server rejects is cleared; an unreachable server never blocks measuring, which is on-device.
 */
export function FitGate({required, next, fallback, children}: {required: boolean; next: string; fallback: React.ReactNode; children: React.ReactNode}) {
  const router = useRouter();
  const [ready, setReady] = useState(!required);
  useEffect(() => {
    if (!required) return;
    const store = browserClientTokenStore();
    const token = store.get();
    const toGate = () => router.replace(`/fit/start?next=${encodeURIComponent(next)}`);
    if (!token) { toGate(); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token is only readable after mount.
    setReady(true);
    let live = true;
    checkFitToken(token).then(async r => {
      if (!live) return;
      if (!r.ok && r.error === 'invalid-token') { store.clear(); toGate(); return; }
      const pending = store.pendingPreference();
      if (r.ok && pending) { const s = await syncFitPreference(token, pending); if (s.ok) store.clearPending(); }
    }).catch(() => { /* offline: keep measuring */ });
    return () => { live = false; };
  }, [required, next, router]);
  return ready ? children : fallback;
}
