'use client';
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {Arrow} from '../icons';
import {browserProfileStore, type SavedProfile} from '@/lib/fit/device-store';
import {getStyle} from '@/lib/fit/styles';
import {formatIn} from '@/lib/fit/units';
import {focusTarget} from './use-focus-on-change';

export function ProfileList() {
  const [profiles, setProfiles] = useState<SavedProfile[] | null>(null);
  const store = browserProfileStore();
  // localStorage is only readable after mount, so the server and first client render agree on the loading line.
  useEffect(() => { setProfiles(store.list()); }, []); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  // A deleted card takes its button with it, so focus moves to the card that took its place, or the empty heading.
  const refocus = useRef<number | null>(null);
  useEffect(() => {
    const i = refocus.current; if (i === null) return; refocus.current = null;
    const mains = document.querySelectorAll('.profile-card .button-primary');
    focusTarget(mains[Math.min(i, mains.length - 1)] ?? document.getElementById('profiles-empty'));
  }, [profiles]);
  if (profiles === null) return <p className="fit-note">Looking for saved measures on this phone.</p>;
  if (!profiles.length) return <div className="fit-panel"><h2 id="profiles-empty" tabIndex={-1}>Nothing saved yet</h2><p className="fit-note">Finish a fit and tap Save to this phone. Measures stay in this browser only.</p><Link className="button button-primary" href="/fit/measure">Start my fit <Arrow/></Link></div>;
  // Saved measures are shown as text, so session recording masks the list.
  return <div className="profile-list" data-clarity-mask="true">
    {profiles.map((p, i) => <article className="profile-card" key={p.id}>
      <p className="eyebrow draft-eyebrow">DRAFT, TAILOR TO VERIFY</p>
      <strong>{p.name || 'Saved measures'}</strong>
      <p className="fit-summary"><span>{getStyle(p.styleId).label}</span><span>Height {formatIn(p.heightCm)}</span><span>Bust {formatIn(p.measures.bust)}</span><span>Saved {new Date(p.savedAt).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}</span></p>
      {store.isStale(p) && <p className="fit-error">These are more than six months old. Re-measure before ordering.</p>}
      <div className="profile-card-actions"><Link className="button button-primary" href={`/fit/measure?step=result&profile=${p.id}`}>Use saved measures</Link><Link className="button button-outline" href={`/fit/measure?step=style&profile=${p.id}`}>Re-measure</Link><button type="button" className="button button-outline" onClick={() => { if (confirm('Delete these saved measures from this phone?')) { store.remove(p.id); refocus.current = i; setProfiles(store.list()); } }}>Delete</button></div>
    </article>)}
    <button type="button" className="text-link" onClick={() => { if (confirm('Delete everything Find Your Fit saved on this phone?')) { store.clear(); refocus.current = 0; setProfiles([]); } }}>Delete all saved measures</button>
  </div>;
}
