'use client';
import {useState, type FormEvent} from 'react';
import {applyTapeCalibration} from '@/lib/fit/calibrate';
import {recalibratedConfidence} from '@/lib/fit/confidence';
import {inToCm, formatIn} from '@/lib/fit/units';
import type {Draft} from './flow-types';

const ERRORS = {'tape-out-of-range': 'Tape values are usually between 16 and 63 in. Check the number.', 'scale-out-of-range': 'That is a long way from the photo estimate. Check the number and which measurement you took.'};

export function CalibrateForm({draft, onChange}: {draft: Draft; onChange(next: Draft): void}) {
  const [field, setField] = useState<'bust' | 'waist'>('bust');
  const [error, setError] = useState<string | null>(null);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const tape = Number(data.get('tape')), length = Number(data.get('length'));
    const r = applyTapeCalibration(draft.raw, field, inToCm(tape), length > 0 ? inToCm(length) : null);
    if (!r.ok) { setError(ERRORS[r.error]); return; }
    setError(null);
    onChange({...draft, measures: r.measures, calibration: r.calibration, confidence: recalibratedConfidence(r.measures, draft, true)});
  }
  function clear() { onChange({...draft, measures: draft.raw, calibration: null, confidence: recalibratedConfidence(draft.raw, draft, false)}); setError(null); }
  return <form className="fit-panel" onSubmit={apply} aria-labelledby="calibrate-title">
    <p className="eyebrow draft-eyebrow">BEST ACCURACY STEP</p><h2 id="calibrate-title">Correct with one tape measure</h2>
    <p className="fit-note">Measure your bust or waist once with a tape. Every girth scales to match. Lengths stay as photographed unless you also enter your kameez length.</p>
    <div className="fit-field"><label htmlFor="cal-field">I measured my</label><select id="cal-field" name="field" value={field} onChange={e => setField(e.target.value as 'bust' | 'waist')}><option value="bust">Bust</option><option value="waist">Waist</option></select></div>
    <div className="fit-field"><label htmlFor="tape">Tape measure, inches <span aria-hidden="true">*</span></label><input id="tape" name="tape" inputMode="decimal" required placeholder={`For example, ${formatIn(draft.raw[field]).replace(' in', '')}`} aria-describedby="tape-error"/></div>
    <div className="fit-field"><label htmlFor="length">Real kameez length, inches <span className="optional">Optional</span></label><input id="length" name="length" inputMode="decimal" placeholder="Leave blank to keep the photo lengths"/></div>
    <p id="tape-error" className="fit-error" role="alert" hidden={!error}>{error}</p>
    <div className="chips"><button className="button button-primary" type="submit">Apply tape</button>{draft.calibration && <button className="button button-outline" type="button" onClick={clear}>Clear</button>}</div>
    {draft.calibration && <p className="fit-note">Calibrated to your {draft.calibration.field} tape of {formatIn(draft.calibration.tapeCm)}. Girths scaled by {draft.calibration.scale}.</p>}
  </form>;
}
