'use client';
import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {TapeRail, STEPS, type StepId} from './tape-rail';
import {StepStyle} from './step-style';
import {initialFlow, type FlowState} from './flow-types';

const isStep = (s: string | null): s is StepId => STEPS.some(step => step.id === s);

/** Owns the flow state in memory. Photos never go anywhere; a reload clears them on purpose. */
export function MeasureFlow() {
  const params = useSearchParams(); const router = useRouter();
  const [state, setState] = useState<FlowState>(initialFlow);
  const requested: StepId = isStep(params.get('step')) ? (params.get('step') as StepId) : 'style';
  // A step cannot show without its inputs: results need a draft, photos need a height.
  const step: StepId = requested === 'result' && !state.draft ? (state.heightCm ? 'photos' : 'style') : requested === 'photos' && !state.heightCm ? 'style' : requested;
  useEffect(() => { if (step !== requested) router.replace(`/fit/measure?step=${step}`); }, [step, requested, router]);
  const go = (s: StepId) => router.push(`/fit/measure?step=${s}`);
  const update = (patch: Partial<FlowState>) => setState(s => ({...s, ...patch}));
  return <>
    <TapeRail current={step}/>
    {step === 'style' && <StepStyle state={state} update={update} onNext={() => go('photos')}/>}
    {step === 'photos' && <main id="main" className="fit-step"><h1>Photos</h1><p className="fit-lede">Coming in Task 13.</p></main>}
    {step === 'result' && <main id="main" className="fit-step"><h1>Your draft fit</h1><p className="fit-lede">Coming in Task 14.</p></main>}
  </>;
}
