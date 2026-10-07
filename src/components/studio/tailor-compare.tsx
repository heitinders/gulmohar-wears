'use client';
import {useState, useSyncExternalStore} from 'react';
import {browserStudioStore, type StudioEntry} from '@/lib/fit/studio-store';
import {fieldRows} from '@/lib/fit/field-labels';
import {inchesText, parseTapeInches, TAPE_MAX_IN, TAPE_MIN_IN} from '@/lib/fit/tailor';
import {formatCm, formatIn} from '@/lib/fit/units';
import type {Field, Values} from '@/lib/fit/measures';

const noop = () => () => {};
const NONE: StudioEntry[] = [];
let cache: {raw: string; list: StudioEntry[]} = {raw: '', list: NONE};
/** Stable snapshot for useSyncExternalStore: re-read storage, reuse the array while nothing changed. */
function snapshot() { const list = browserStudioStore().list(); const raw = JSON.stringify(list); if (raw !== cache.raw) cache = {raw, list}; return cache.list; }

/** Draft value against the tailor's tape, per field, for a client held on this device. Corrections stay on this device. */
export function TailorCompare() {
  const entries = useSyncExternalStore(noop, snapshot, () => NONE);
  const [phone, setPhone] = useState('');
  const entry = entries.find(e => e.phone === phone) ?? null;
  return <>
    {!entries.length ? <p className="fit-note">No client measures on this device yet. Measure a client under Fit, or import a customer&apos;s draft code.</p> :
      <div className="fit-field studio-picker"><label htmlFor="tailor-client">Client on this device</label><select id="tailor-client" value={phone} onChange={e => setPhone(e.target.value)}><option value="">Choose a client</option>{entries.map(e => <option key={e.phone} value={e.phone}>{e.name} ({e.phone})</option>)}</select></div>}
    {entry && <TailorForm key={`${entry.phone}${entry.savedAt}`} entry={entry}/>}
  </>;
}

function TailorForm({entry}: {entry: StudioEntry}) {
  const rows = fieldRows(entry.styleId);
  const [text, setText] = useState<Record<string, string>>(() => Object.fromEntries(rows.map(([k]) => [k, entry.tailor?.values[k] != null ? inchesText(entry.tailor.values[k]!) : ''])));
  const [verified, setVerified] = useState<Set<Field>>(() => new Set(entry.tailor?.verified ?? []));
  const [saved, setSaved] = useState(new Set(entry.tailor?.verified ?? []));
  const [error, setError] = useState<string | null>(null); const [status, setStatus] = useState('');
  function save(e: React.FormEvent) {
    e.preventDefault(); setStatus('');
    const values: Partial<Values> = {};
    for (const [k, label] of rows) {
      const r = parseTapeInches(text[k] ?? '');
      if (!r.ok) { setError(`${label}: enter a tape value between ${TAPE_MIN_IN} and ${TAPE_MAX_IN} inches.`); document.getElementById(`tape-${k}`)?.focus(); return; }
      if (r.cm != null) values[k] = r.cm;
    }
    const ok = browserStudioStore().attachTailor(entry.phone, values, [...verified]);
    setError(ok ? null : "Couldn't save on this device. Private browsing or full storage can cause this.");
    if (ok) { setSaved(new Set(verified)); setStatus('Saved on this device. Draft values are kept alongside.'); }
  }
  const toggle = (k: Field, on: boolean) => setVerified(v => { const n = new Set(v); if (on) n.add(k); else n.delete(k); return n; });
  return <form className="fit-form" onSubmit={save}>
    <p className="fit-note">{entry.source === 'import' ? 'Imported from the customer’s draft code' : 'Measured in the shop'} on {new Date(entry.savedAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}. Type the tape value in inches where it differs, and tick Verified once checked.</p>
    <ul className="tailor-list">{rows.map(([k, label]) => <li key={k} className="tailor-row">
      <div><strong>{label}</strong><small>{saved.has(k) ? 'tailor verified' : entry.source === 'import' ? 'customer draft' : 'studio draft'}</small></div>
      <div className="tailor-draft"><span>{formatIn(entry.measures[k])}</span><small>{formatCm(entry.measures[k])}</small></div>
      <div className="fit-field"><label htmlFor={`tape-${k}`}>Tape, inches<span className="sr-only"> for {label}</span></label><input id={`tape-${k}`} inputMode="decimal" autoComplete="off" value={text[k] ?? ''} onChange={e => setText(t => ({...t, [k]: e.target.value}))}/></div>
      <label className="consent-check tailor-verified"><input type="checkbox" checked={verified.has(k)} onChange={e => toggle(k, e.target.checked)}/><span>Verified<span className="sr-only"> {label}</span></span></label>
    </li>)}</ul>
    <p className="fit-error" role="alert" hidden={!error}>{error}</p>
    <p className="fit-note" role="status">{status}</p>
    <button type="submit" className="button button-primary">Save corrections</button>
  </form>;
}
