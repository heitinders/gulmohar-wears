'use client';
import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {TapeRail, STEPS, type StepId} from './tape-rail';
import {StepStyle} from './step-style';
import {StepPhotos} from './step-photos';
import {StepResult} from './step-result';
import {browserProfileStore} from '@/lib/fit/device-store';
import {emptyBrief, initialFlow, type FlowState, type StudioMode} from './flow-types';

const isStep = (s: string | null): s is StepId => STEPS.some(step => step.id === s);

/** Owns the flow state in memory. Photos never go anywhere; a reload clears them on purpose. */
export function MeasureFlow({basePath = '/fit/measure', studio}: {basePath?: string; studio?: StudioMode} = {}) {
  const params = useSearchParams(); const router = useRouter();
  const start: FlowState = studio ? {...initialFlow, name: studio.client.name} : initialFlow;
  const [state, setState] = useState<FlowState>(start);
  const [loadedProfile, setLoadedProfile] = useState(false);
  const requested: StepId = isStep(params.get('step')) ? (params.get('step') as StepId) : 'style';
  const profileId = studio ? null : params.get('profile');
  // A saved profile lives in this browser only, so it can only be read after mount.
  useEffect(() => {
    if (!profileId) return;
    const p = browserProfileStore().list().find(x => x.id === profileId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount; this copies the profile in once.
    if (p) setState(s => ({...s, name: p.name, styleId: p.styleId, heightCm: p.heightCm, kameezOverrideCm: p.kameezOverrideCm, preference: p.preference, brief: p.brief ?? emptyBrief, profileId: p.id,
      draft: requested === 'result' ? {measures: p.measures, raw: p.rawMeasures ?? p.measures, confidence: p.confidence, baseConfidence: p.rawConfidence ?? (p.calibration ? null : p.confidence), calibration: p.calibration, frontLm: null, sideLm: null, quality: null} : null}));
    setLoadedProfile(true);
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Until the profile effect has run, a saved result has no draft and the style step's fields would mount empty
  // (they read their text once), so every step waits instead of redirecting or showing blanks.
  const loading = !!profileId && !loadedProfile;
  // A step cannot show without its inputs: results need a draft, photos need a height.
  const step: StepId = requested === 'result' && !state.draft ? (state.heightCm ? 'photos' : 'style') : requested === 'photos' && !state.heightCm ? 'style' : requested;
  useEffect(() => { if (!loading && step !== requested) router.replace(`${basePath}?step=${step}`); }, [loading, step, requested, router, basePath]);
  const go = (s: StepId) => router.push(`${basePath}?step=${s}`);
  const update = (patch: Partial<FlowState>) => setState(s => ({...s, ...patch}));
  if (loading) return <main id="main" className="fit-step"><h1>Find your fit</h1></main>;
  return <>
    <TapeRail current={step}/>
    {step === 'style' && <StepStyle state={state} update={update} onNext={() => go('photos')}/>}
    {step === 'photos' && <StepPhotos state={state} update={update} onBack={() => go('style')} onDone={() => go('result')}/>}
    {step === 'result' && <StepResult state={state} update={update} studio={studio} onRemeasure={() => { update({front: null, side: null, draft: null, attempts: 0}); go('photos'); }} onRestart={() => { setState(start); go('style'); }}/>}
  </>;
}
