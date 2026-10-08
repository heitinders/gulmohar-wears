'use client';
import {Suspense, useState} from 'react';
import {MeasureFlow} from '../fit/measure-flow';
import {browserStudioStore} from '@/lib/fit/studio-store';
import {FIELDS, type Values} from '@/lib/fit/measures';
import type {FlowState} from '../fit/flow-types';
import {useFocusOnChange} from '../fit/use-focus-on-change';

type Client = {phone: string; name: string};

function save(client: Client, s: FlowState) {
  const d = s.draft; if (!d || !s.heightCm) return false;
  return browserStudioStore().save({phone: client.phone, name: client.name, styleId: s.styleId, heightCm: s.heightCm, fit: s.preference.fit, measures: Object.fromEntries(FIELDS.map(f => [f, d.measures[f]])) as Values, confidence: d.confidence, source: 'studio-fit'});
}

/** The customer measuring flow, run in the shop for a chosen client. Results stay on this device (spec 4.1). */
export function StudioFit({clients}: {clients: Client[] | null}) {
  const [phone, setPhone] = useState(''); const [chosen, setChosen] = useState<Client | null>(null);
  useFocusOnChange(chosen ? `client-${chosen.phone}` : 'pick', '#main h1');
  // The same focused shell customers get, so the camera step has the whole viewport; the studio bar steps aside.
  if (chosen) return <div className="fit-focus">
    <header className="focus-bar"><div className="focus-bar-inner"><button type="button" className="focus-back" onClick={() => setChosen(null)}>← Change client</button><span className="studio-context">Measuring <strong>{chosen.name}</strong></span></div></header>
    <Suspense fallback={<main id="main" className="fit-step"><h1>Find your fit</h1></main>}><MeasureFlow basePath="/studio/fit" studio={{client: chosen, onSave: s => save(chosen, s)}}/></Suspense>
  </div>;
  return <main id="main" className="studio-page">
    <div><p className="eyebrow">STUDIO</p><h1>Fit</h1></div>
    <p className="fit-lede">Measure a client in the shop with the same steps customers use. The draft is saved on this device only, against the client you choose.</p>
    {clients === null ? <p className="fit-error">The client list could not be loaded just now. Refresh to try again.</p> : !clients.length ? <p className="fit-note">No clients yet. A client appears after they complete the consent step.</p> :
      <form className="fit-form studio-picker" onSubmit={e => { e.preventDefault(); const c = clients.find(x => x.phone === phone); if (c) setChosen(c); }}>
        <div className="fit-field"><label htmlFor="studio-client">Client</label><select id="studio-client" required value={phone} onChange={e => setPhone(e.target.value)}><option value="">Choose a client</option>{clients.map(c => <option key={c.phone} value={c.phone}>{c.name} ({c.phone})</option>)}</select></div>
        <button type="submit" className="button button-primary" disabled={!phone}>Start measuring</button>
      </form>}
  </main>;
}
