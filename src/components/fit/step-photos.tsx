'use client';
import {useEffect, useMemo, useState} from 'react';
import {Arrow} from '../icons';
import {CameraCapture} from './camera-capture';
import {PoseTips} from './pose-tips';
import {OnDeviceProvider, measureFromHeight, type MeasureOutcome} from '@/lib/fit/measure-provider';
import {loadPoseDetector} from '@/lib/fit/pose';
import type {StepProps} from './flow-types';
import {useFocusOnChange} from './use-focus-on-change';

type Phase = 'front' | 'side' | 'measuring' | 'blocked' | 'unavailable';

export function StepPhotos({state, update, onBack, onDone}: StepProps & {onBack(): void; onDone(): void}) {
  const provider = useMemo(() => new OnDeviceProvider(), []);
  const [phase, setPhase] = useState<Phase>(state.front ? 'side' : 'front');
  const [blocked, setBlocked] = useState<Extract<MeasureOutcome, {reason: 'pose-blocked'}> | null>(null);
  useFocusOnChange(phase, '#main h1');
  useEffect(() => { loadPoseDetector().catch(() => {}); }, []); // warm the model while the customer frames the shot

  async function measure(front: Blob, side: Blob | null, force = false) {
    if (!state.heightCm) { onBack(); return; }
    setPhase('measuring');
    let outcome: MeasureOutcome;
    // A photo the browser cannot decode must not leave the customer on "Measuring" forever.
    try { outcome = await provider.measure({front, side, heightCm: state.heightCm, kameezOverrideCm: state.kameezOverrideCm, styleId: state.styleId, force}); } catch { setPhase('unavailable'); return; }
    if (outcome.ok) { update({draft: {measures: outcome.measures, raw: outcome.measures, confidence: outcome.confidence, baseConfidence: outcome.confidence, calibration: null, frontLm: outcome.frontLm, sideLm: outcome.sideLm, quality: outcome.quality}}); onDone(); return; }
    if (outcome.reason === 'model-unavailable') { setPhase('unavailable'); return; }
    setBlocked(outcome); update({attempts: state.attempts + 1}); setPhase('blocked');
  }
  function heightOnly() {
    if (!state.heightCm) return;
    const r = measureFromHeight(state.heightCm, state.kameezOverrideCm, state.styleId);
    update({draft: {measures: r.measures, raw: r.measures, confidence: r.confidence, baseConfidence: r.confidence, calibration: null, frontLm: null, sideLm: null, quality: null}}); onDone();
  }

  // One main and one status line stay mounted across phases, so the status is announced when its text changes.
  const capture = phase === 'front' || phase === 'side';
  return <main id="main" className={capture ? 'fit-step fit-step-capture' : 'fit-step'}>
    <p className="sr-only" role="status">{phase === 'measuring' ? 'Measuring your photos on this phone. This takes a few seconds.' : ''}</p>
    {/* Keyed by shot so the front preview never carries over into the side capture. */}
    {phase === 'front' && <><h1 className="eyebrow capture-heading">FRONT PHOTO</h1><CameraCapture key="front" shot="front" onCapture={blob => { update({front: blob}); setPhase('side'); }}/></>}
    {phase === 'side' && <><h1 className="eyebrow capture-heading">SIDE PHOTO</h1><CameraCapture key="side" shot="side" onCapture={blob => { update({side: blob}); measure(state.front!, blob); }}/></>}
    {phase === 'measuring' && <><h1>Measuring</h1><p className="fit-lede">Reading your pose on this phone. This takes a few seconds and nothing is uploaded.</p></>}
    {phase === 'unavailable' && <><h1>We couldn&apos;t load the measuring tool</h1><p className="fit-lede">Your browser blocked it or the connection dropped. You can try again, or continue with a height-only draft, which is less precise.</p><div className="fit-actions"><button className="button button-primary" type="button" onClick={() => measure(state.front!, state.side)}>Try again</button><button className="button button-outline" type="button" onClick={heightOnly}>Use height only</button></div></>}
    {phase === 'blocked' && <>
      <h1>Let&apos;s retake that</h1><p className="fit-lede">We couldn&apos;t read your pose well enough for a draft.</p>
      {blocked && <PoseTips issues={blocked.quality.issues}/>}
      <div className="fit-actions">
        <button className="button button-primary" type="button" onClick={() => { update({front: null, side: null}); setPhase('front'); }}>Retake photos <Arrow/></button>
        {state.attempts >= 2 && <button className="button button-outline" type="button" onClick={() => measure(state.front!, state.side, true)}>Use these anyway (weaker draft)</button>}
      </div>
    </>}
  </main>;
}
