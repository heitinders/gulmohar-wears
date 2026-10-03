'use client';
import {FIT_LABELS, NECKLINE_LABELS, SLEEVE_LABELS, type FitId, type FitPreference, type NecklineId, type SleeveId} from '@/lib/fit/fit-preference';

function Chips<T extends string>({legend, options, value, onChange}: {legend: string; options: Record<T, string>; value: T; onChange(v: T): void}) {
  return <fieldset><legend>{legend}</legend><div className="chips">{(Object.keys(options) as T[]).map(k => <button key={k} type="button" className="chip" aria-pressed={value === k} onClick={() => onChange(k)}>{options[k]}</button>)}</div></fieldset>;
}

export function FitPreferenceForm({value, onChange}: {value: FitPreference; onChange(next: FitPreference): void}) {
  return <section className="fit-panel" aria-labelledby="pref-title"><h2 id="pref-title">How you like it to sit</h2>
    <Chips<FitId> legend="Fit" options={FIT_LABELS} value={value.fit} onChange={fit => onChange({...value, fit})}/>
    <Chips<SleeveId> legend="Sleeve" options={SLEEVE_LABELS} value={value.sleeve} onChange={sleeve => onChange({...value, sleeve})}/>
    <Chips<NecklineId> legend="Neckline" options={NECKLINE_LABELS} value={value.neckline} onChange={neckline => onChange({...value, neckline})}/>
    <div className="fit-field"><label htmlFor="length-note">Length note <span className="optional">Optional</span></label><input id="length-note" maxLength={120} placeholder="For example, just below the knee" value={value.lengthNote} onChange={e => onChange({...value, lengthNote: e.target.value})}/></div>
    <p className="fit-note">Fitted takes 1 cm off the girths before we compare with the size chart, Relaxed adds 2.5 cm. The numbers above do not change.</p>
  </section>;
}
