'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {Arrow} from '../icons';
import {Ledger} from './ledger';
import {CalibrateForm} from './calibrate-form';
import {FitPreferenceForm} from './fit-preference-form';
import {SizeAdvicePanel} from './size-advice';
import {OrderBriefForm} from './order-brief-form';
import {SendOnWhatsApp} from './send-on-whatsapp';
import {getStyle} from '@/lib/fit/styles';
import {formatIn} from '@/lib/fit/units';
import {browserProfileStore} from '@/lib/fit/device-store';
import type {StepProps, StudioMode} from './flow-types';
import {browserClientTokenStore} from '@/lib/fit/client-token';
import {syncFitPreference} from '@/app/fit/actions';

const PHOTOS = {landmarks: 'front and side photos', hybrid: 'front photo only', ratio: 'height only', none: 'height only'} as const;

export function StepResult({state, update, onRemeasure, onRestart, studio}: StepProps & {onRemeasure(): void; onRestart(): void; studio?: StudioMode}) {
  const draft = state.draft!; const style = getStyle(state.styleId);
  const [saved, setSaved] = useState<'idle' | 'ok' | 'failed'>('idle');
  // Style and fit choices go to the atelier's client list; measurements never do (spec 4.2).
  const {styleId, preference, brief} = state;
  useEffect(() => {
    // In the studio the device may hold some other customer's token, so nothing syncs from here.
    if (studio) return;
    const store = browserClientTokenStore(); const token = store.get(); if (!token) return;
    const patch = {style: styleId, fit: preference.fit, sleeve: preference.sleeve, neckline: preference.neckline, lengthNote: preference.lengthNote, brief: {occasion: brief.occasion, fabric: brief.fabric, city: brief.city, deadline: brief.deadline}};
    const timer = setTimeout(() => {
      syncFitPreference(token, patch).then(r => { if (r.ok) store.clearPending(); else if (r.error === 'unavailable') store.setPendingPreference(patch); }).catch(() => store.setPendingPreference(patch));
    }, 800);
    return () => clearTimeout(timer);
  }, [styleId, preference, brief, studio]);
  const adjusted = draft.measures.sources && Object.values(draft.measures.sources).some(s => s === 'ratio-clamped');
  function save() {
    const r = browserProfileStore().save({id: state.profileId ?? undefined, name: state.name, styleId: state.styleId, heightCm: state.heightCm!, kameezOverrideCm: state.kameezOverrideCm, preference: state.preference, measures: draft.measures, rawMeasures: draft.raw, calibration: draft.calibration, confidence: draft.confidence, rawConfidence: draft.baseConfidence, brief: state.brief});
    if (r.ok && r.profile) { update({profileId: r.profile.id}); setSaved('ok'); } else setSaved('failed');
  }
  // Measurements appear as text from here on, so session recording masks the whole step.
  return <main id="main" className="fit-step" data-clarity-mask="true">
    <div><p className="eyebrow draft-eyebrow">DRAFT, TAILOR TO VERIFY</p><h1>Your draft fit</h1>
      <p className="fit-summary"><span>{state.name || 'Your measurements'}</span><span>{style.label}</span><span>Height {formatIn(state.heightCm!)}</span><span>From {PHOTOS[draft.measures.mode]}</span></p></div>
    <p className="fit-lede">{draft.calibration ? 'Calibrated to your tape. Girths are usually within half an inch to an inch now.' : 'Before a tape measurement, girths can be off by an inch or two, sometimes more. The tape step below is the one that matters most.'}{adjusted ? ' Some values were adjusted to typical body proportions because the photo did not give a clear reading.' : ''}</p>
    <Ledger draft={draft} styleId={state.styleId}/>
    <CalibrateForm draft={draft} onChange={next => update({draft: next})}/>
    <FitPreferenceForm value={state.preference} onChange={preference => update({preference})}/>
    <SizeAdvicePanel measures={draft.measures} fit={state.preference.fit}/>
    <OrderBriefForm value={state.brief} onChange={brief => update({brief})}/>
    {studio ? <>
      <div className="chips"><button type="button" className="button button-primary" onClick={() => setSaved(studio.onSave(state) ? 'ok' : 'failed')}>Save for {studio.client.name} on this device</button></div>
      <p className="fit-note" role="status">{saved === 'ok' ? 'Saved on this device. It is not uploaded anywhere.' : saved === 'failed' ? "Couldn't save on this device. Private browsing or full storage can cause this." : ''}</p>
    </> : <>
      <div className="chips"><button type="button" className="button button-outline" onClick={save}>{state.profileId ? 'Update saved measures' : 'Save to this phone'}</button><Link className="text-link" href="/fit/profile">Saved measures <Arrow/></Link></div>
      <p className="fit-note" role="status">{saved === 'ok' ? 'Saved in this browser only. Nothing leaves your phone.' : saved === 'failed' ? "Couldn't save on this phone. Private browsing or full storage can cause this. You can still send the draft." : ''}</p>
      <SendOnWhatsApp state={state}/>
    </>}
    <div className="fit-actions"><button type="button" className="button button-outline" onClick={onRemeasure}>Retake photos</button><button type="button" className="text-link" onClick={onRestart}>Start over</button></div>
  </main>;
}
