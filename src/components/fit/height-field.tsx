'use client';
import {useState} from 'react';
import {cmToIn, inToCm} from '@/lib/fit/units';

const MIN_IN = 47, MAX_IN = 87; // app.js L2724-2730
type Unit = 'in' | 'cm';

/** Height in inches by default, cm on request. Reports cm or null; shows the range error beside the field. */
export function HeightField({valueCm, onChange}: {valueCm: number | null; onChange(cm: number | null): void}) {
  const [unit, setUnit] = useState<Unit>('in');
  const [text, setText] = useState(valueCm ? String(Math.round(cmToIn(valueCm))) : '');
  const [error, setError] = useState<string | null>(null);
  const toCm = (raw: string, u: Unit) => { const n = Number(raw.replace(',', '.')); if (!raw.trim() || !Number.isFinite(n)) return null; const inches = u === 'in' ? n : cmToIn(n); return inches >= MIN_IN && inches <= MAX_IN ? inToCm(inches) : Number.NaN; };
  const commit = (raw: string, u: Unit) => { const cm = toCm(raw, u); if (cm === null || Number.isNaN(cm)) { setError(u === 'in' ? `Height is usually between ${MIN_IN} and ${MAX_IN} in. Check the number.` : 'Height is usually between 119 and 221 cm. Check the number.'); onChange(null); } else { setError(null); onChange(cm); } };
  const switchUnit = (u: Unit) => { if (u === unit) return; const cm = toCm(text, unit); setUnit(u); setError(null); if (cm && !Number.isNaN(cm)) { const next = u === 'in' ? String(Math.round(cmToIn(cm))) : String(Math.round(cm)); setText(next); onChange(cm); } };
  return <div className="fit-field">
    <label htmlFor="height">Height <span aria-hidden="true">*</span></label>
    <div className="fit-field-row">
      <input id="height" name="height" inputMode="decimal" required autoComplete="off" placeholder={unit === 'in' ? 'For example, 64' : 'For example, 163'} value={text} aria-describedby="height-hint height-error" aria-invalid={error ? true : undefined} onChange={e => setText(e.target.value)} onBlur={e => commit(e.target.value, unit)}/>
      <div className="unit-toggle" role="group" aria-label="Height unit"><button type="button" className="chip" aria-pressed={unit === 'in'} onClick={() => switchUnit('in')}>in</button><button type="button" className="chip" aria-pressed={unit === 'cm'} onClick={() => switchUnit('cm')}>cm</button></div>
    </div>
    <span id="height-hint" className="fit-note">Stand straight without shoes. Every photo measurement is scaled from this, so it must be right.</span>
    <p id="height-error" className="fit-error" role="alert" hidden={!error}>{error}</p>
  </div>;
}
