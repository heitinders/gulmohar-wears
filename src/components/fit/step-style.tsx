'use client';
import {useState, type FormEvent} from 'react';
import {Arrow} from '../icons';
import {StylePicker} from './style-picker';
import {HeightField} from './height-field';
import {inToCm} from '@/lib/fit/units';
import {getStyle} from '@/lib/fit/styles';
import type {StepProps} from './flow-types';

export function StepStyle({state, update, onNext}: StepProps & {onNext(): void}) {
  const [error, setError] = useState<string | null>(null);
  const style = getStyle(state.styleId);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.heightCm) { setError('Enter your height first. The photos are scaled from it.'); (document.getElementById('height') as HTMLInputElement | null)?.focus(); return; }
    setError(null); onNext();
  }
  return <main id="main" className="fit-step"><form className="fit-form" onSubmit={submit} noValidate>
    <div><h1>Choose your silhouette</h1><p className="fit-lede">Pick the style you have in mind, then your height. Every estimate is scaled from it.</p></div>
    <StylePicker value={state.styleId} onChange={id => update({styleId: id})}/>
    <p className="fit-note">{style.note}. {style.id === 'punjabi' ? 'Kameez to mid thigh, about 45% of your height.' : `Kameez about ${Math.round(style.kameezRatio * 100)}% of your height unless you set a length below.`}</p>
    <div className="fit-field"><label htmlFor="name">Your name <span className="optional">Optional</span></label><input id="name" name="name" autoComplete="given-name" maxLength={80} placeholder="For example, Simran" value={state.name} onChange={e => update({name: e.target.value})}/></div>
    <HeightField valueCm={state.heightCm} onChange={cm => update({heightCm: cm})}/>
    <div className="fit-field"><label htmlFor="kameez">Kameez length you like <span className="optional">Optional, inches</span></label><input id="kameez" name="kameez" inputMode="decimal" placeholder="Leave blank for the usual length" value={state.kameezOverrideCm ? String(Math.round(state.kameezOverrideCm / 2.54)) : ''} onChange={e => { const n = Number(e.target.value); update({kameezOverrideCm: Number.isFinite(n) && n >= 20 && n <= 63 ? inToCm(n) : null}); }}/><span className="fit-note">Measured from the shoulder down. 20 to 63 in.</span></div>
    <p className="fit-error" role="alert" hidden={!error}>{error}</p>
    <div className="fit-actions"><button className="button button-primary" type="submit">Next: Photos <Arrow/></button></div>
  </form></main>;
}
