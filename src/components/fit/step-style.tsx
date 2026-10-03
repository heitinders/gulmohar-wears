'use client';
import {useState, type FormEvent} from 'react';
import {Arrow} from '../icons';
import {StylePicker} from './style-picker';
import {HeightField} from './height-field';
import {cmToIn} from '@/lib/fit/units';
import {KAMEEZ_MAX_IN, KAMEEZ_MIN_IN, parseKameezIn} from '@/lib/fit/length-input';
import {getStyle} from '@/lib/fit/styles';
import type {StepProps} from './flow-types';

const field = (form: HTMLFormElement, name: string) => form.elements.namedItem(name) as HTMLInputElement | null;

export function StepStyle({state, update, onNext}: StepProps & {onNext(): void}) {
  const [error, setError] = useState<string | null>(null);
  // The kameez field keeps its own text so a partly typed number (the 3 of 35) stays on screen.
  const [kameezText, setKameezText] = useState(state.kameezOverrideCm ? String(Math.round(cmToIn(state.kameezOverrideCm) * 4) / 4) : '');
  const [kameezFlagged, setKameezFlagged] = useState(false);
  const kameez = parseKameezIn(kameezText);
  const kameezOutOfRange = !kameez.ok && kameez.reason === 'range';
  const kameezError = kameezFlagged && kameezOutOfRange ? `Kameez length is usually between ${KAMEEZ_MIN_IN} and ${KAMEEZ_MAX_IN} in. Check the number, or leave it blank.` : null;
  const style = getStyle(state.styleId);
  function editKameez(raw: string) {
    setKameezText(raw);
    const r = parseKameezIn(raw);
    // With a valid height the only form error left is the kameez one, so a fixed length clears it.
    if (r.ok || r.reason === 'empty') { setKameezFlagged(false); if (state.heightCm) setError(null); }
    update({kameezOverrideCm: r.ok ? r.cm : null});
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!state.heightCm) {
      const typed = field(form, 'height')?.value.trim();
      setError(typed ? 'Check your height. The photos are scaled from it.' : 'Enter your height first. The photos are scaled from it.');
      field(form, 'height')?.focus(); return;
    }
    if (kameezOutOfRange) { setKameezFlagged(true); setError('Check the kameez length, or leave it blank.'); field(form, 'kameez')?.focus(); return; }
    setError(null); onNext();
  }
  return <main id="main" className="fit-step"><form className="fit-form" onSubmit={submit} noValidate>
    <div><h1>Choose your silhouette</h1><p className="fit-lede">Pick the style you have in mind, then your height. Every estimate is scaled from it.</p></div>
    <StylePicker value={state.styleId} onChange={id => update({styleId: id})}/>
    {/* The selected card already carries the style note, so this line only adds the kameez proportion. */}
    <p className="fit-note">{style.id === 'punjabi' ? 'Kameez to mid thigh, about 45% of your height.' : `Kameez about ${Math.round(style.kameezRatio * 100)}% of your height unless you set a length below.`}</p>
    <div className="fit-field"><label htmlFor="name">Your name <span className="optional">Optional</span></label><input id="name" name="name" autoComplete="given-name" maxLength={80} placeholder="For example, Simran" value={state.name} onChange={e => update({name: e.target.value})}/></div>
    <HeightField valueCm={state.heightCm} showError={error !== null} onChange={cm => { update({heightCm: cm}); if (cm !== null) setError(null); }}/>
    <div className="fit-field"><label htmlFor="kameez">Kameez length you like <span className="optional">Optional, inches</span></label><input id="kameez" name="kameez" inputMode="decimal" placeholder="Leave blank for the usual length" value={kameezText} aria-describedby="kameez-hint kameez-error" aria-invalid={kameezError ? true : undefined} onChange={e => editKameez(e.target.value)} onBlur={() => setKameezFlagged(kameezOutOfRange)}/><span id="kameez-hint" className="fit-note">Measured from the shoulder down. {KAMEEZ_MIN_IN} to {KAMEEZ_MAX_IN} in.</span><p id="kameez-error" className="fit-error" role="alert" hidden={!kameezError}>{kameezError}</p></div>
    <p className="fit-error" role="alert" hidden={!error}>{error}</p>
    <div className="fit-actions"><button className="button button-primary" type="submit">Next: Photos <Arrow/></button></div>
  </form></main>;
}
