'use client';
import {STYLES, type StyleId} from '@/lib/fit/styles';
import {StyleArt} from './style-art';

export function StylePicker({value, onChange}: {value: StyleId; onChange(id: StyleId): void}) {
  return <fieldset><legend>Suit style <span aria-hidden="true">*</span></legend>
    <div className="style-grid">{STYLES.map(s => <button key={s.id} type="button" className="style-card" aria-pressed={value === s.id} onClick={() => onChange(s.id)}><StyleArt id={s.id}/><strong>{s.label}</strong><small>{s.note}</small></button>)}</div>
  </fieldset>;
}
