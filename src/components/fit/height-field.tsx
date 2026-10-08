'use client';
import {useState} from 'react';
import {cmToIn} from '@/lib/fit/units';
import {HEIGHT_MAX_IN, HEIGHT_MIN_IN, parseHeight, type LengthUnit} from '@/lib/fit/length-input';

/**
 * Height in inches by default, cm on request. Reports cm or null on every keystroke, so a submit by Enter
 * never sees a stale value. The range error shows after blur or on a form error; otherwise the form's error shows here.
 */
export function HeightField({valueCm, onChange, error: formError = null}: {valueCm: number | null; onChange(cm: number | null): void; error?: string | null}) {
  const [unit, setUnit] = useState<LengthUnit>('in');
  const [text, setText] = useState(valueCm ? String(Math.round(cmToIn(valueCm))) : '');
  const [flagged, setFlagged] = useState(false);
  const parsed = parseHeight(text, unit);
  const outOfRange = !parsed.ok && parsed.reason === 'range';
  const error = ((flagged || formError) && outOfRange ? (unit === 'in' ? `Height is usually between ${HEIGHT_MIN_IN} and ${HEIGHT_MAX_IN} in. Check the number.` : 'Height is usually between 119 and 221 cm. Check the number.') : null) ?? formError;
  const report = (raw: string, u: LengthUnit) => { const r = parseHeight(raw, u); if (r.ok) setFlagged(false); onChange(r.ok ? r.cm : null); };
  const edit = (raw: string) => { setText(raw); report(raw, unit); };
  const switchUnit = (u: LengthUnit) => { if (u === unit) return; setUnit(u); if (parsed.ok) { setText(u === 'in' ? String(Math.round(cmToIn(parsed.cm))) : String(Math.round(parsed.cm))); onChange(parsed.cm); } else report(text, u); };
  return <div className="fit-field">
    <label htmlFor="height">Height <span aria-hidden="true">*</span></label>
    <div className="fit-field-row">
      <input id="height" name="height" inputMode="decimal" required autoComplete="off" placeholder={unit === 'in' ? 'For example, 64' : 'For example, 163'} value={text} aria-describedby="height-hint height-error" aria-invalid={error ? true : undefined} onChange={e => edit(e.target.value)} onBlur={() => setFlagged(outOfRange)}/>
      <div className="unit-toggle" role="group" aria-label="Unit for height"><button type="button" className="chip" aria-pressed={unit === 'in'} onClick={() => switchUnit('in')}>in</button><button type="button" className="chip" aria-pressed={unit === 'cm'} onClick={() => switchUnit('cm')}>cm</button></div>
    </div>
    <span id="height-hint" className="fit-note">Stand straight without shoes. Every photo measurement is scaled from this, so it must be right.</span>
    <p id="height-error" className="fit-error" role="alert" hidden={!error}>{error}</p>
  </div>;
}
