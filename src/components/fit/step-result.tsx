'use client';
import {useState} from 'react';
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
import type {StepProps} from './flow-types';

const PHOTOS = {landmarks: 'front and side photos', hybrid: 'front photo only', ratio: 'height only', none: 'height only'} as const;

export function StepResult({state, update, onRemeasure, onRestart}: StepProps & {onRemeasure(): void; onRestart(): void}) {
  const draft = state.draft!; const style = getStyle(state.styleId);
  const [saved, setSaved] = useState<'idle' | 'ok' | 'failed'>('idle');
  const adjusted = draft.measures.sources && Object.values(draft.measures.sources).some(s => s === 'ratio-clamped');
  function save() {
    const r = browserProfileStore().save({id: state.profileId ?? undefined, name: state.name, styleId: state.styleId, heightCm: state.heightCm!, kameezOverrideCm: state.kameezOverrideCm, preference: state.preference, measures: draft.measures, rawMeasures: draft.raw, calibration: draft.calibration, confidence: draft.confidence, brief: state.brief});
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
    <div className="chips"><button type="button" className="button button-outline" onClick={save}>{state.profileId ? 'Update saved measures' : 'Save to this phone'}</button><Link className="text-link" href="/fit/profile">Saved measures <Arrow/></Link></div>
    <p className="fit-note" role="status">{saved === 'ok' ? 'Saved in this browser only. Nothing leaves your phone.' : saved === 'failed' ? "Couldn't save on this phone. Private browsing or full storage can cause this. You can still send the draft." : ''}</p>
    <SendOnWhatsApp state={state}/>
    <div className="fit-actions"><button type="button" className="button button-outline" onClick={onRemeasure}>Retake photos</button><button type="button" className="text-link" onClick={onRestart}>Start over</button></div>
  </main>;
}
