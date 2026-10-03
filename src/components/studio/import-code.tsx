'use client';
import {useState} from 'react';
import {decodeDraftCode} from '@/lib/fit/handoff';
import {browserStudioStore} from '@/lib/fit/studio-store';
import {getStyle} from '@/lib/fit/styles';
import {FIT_LABELS} from '@/lib/fit/fit-preference';
import {formatIn} from '@/lib/fit/units';

type Client = {phone: string; name: string};

/** Paste a customer's DRAFT code; the decoded measures attach to the chosen client on this device only (spec 4.1). */
export function ImportCode({clients}: {clients: Client[] | null}) {
  const [phone, setPhone] = useState(''); const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null); const [done, setDone] = useState<string | null>(null);
  function submit(e: React.FormEvent) {
    e.preventDefault(); setDone(null);
    const client = clients?.find(c => c.phone === phone);
    if (!client) { setError('Choose the client first.'); return; }
    const r = decodeDraftCode(code);
    if (!r.ok) { setError('This code looks incomplete. Ask the customer to resend it.'); return; }
    const p = r.payload;
    const ok = browserStudioStore().save({phone: client.phone, name: client.name, styleId: p.style, heightCm: p.heightCm, fit: p.fit, measures: p.m, confidence: {}, source: 'import'});
    if (!ok) { setError("Couldn't save on this device. Private browsing or full storage can cause this."); return; }
    setError(null); setCode('');
    setDone(`Imported for ${client.name}: ${getStyle(p.style).label}, ${FIT_LABELS[p.fit]}, bust ${formatIn(p.m.bust)}${p.calibrated ? ', calibrated to a tape' : ''}. Saved on this device only.`);
  }
  if (clients === null) return <p className="fit-error">The client list could not be loaded just now. Refresh to try again.</p>;
  return <form className="fit-form" onSubmit={submit}>
    <div className="fit-field"><label htmlFor="import-client">Client</label><select id="import-client" value={phone} onChange={e => setPhone(e.target.value)}><option value="">Choose a client</option>{clients.map(c => <option key={c.phone} value={c.phone}>{c.name} ({c.phone})</option>)}</select></div>
    <div className="fit-field"><label htmlFor="import-code">Draft code</label><textarea id="import-code" rows={3} spellCheck={false} autoComplete="off" placeholder="GW1." value={code} aria-describedby="import-error" onChange={e => setCode(e.target.value)}/><span className="fit-note">The last line of the customer&apos;s WhatsApp message, starting GW1.</span></div>
    <p id="import-error" className="fit-error" role="alert" hidden={!error}>{error}</p>
    <p className="fit-note" role="status">{done}</p>
    <button type="submit" className="button button-primary">Import</button>
  </form>;
}
