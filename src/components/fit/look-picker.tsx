'use client';
import {GarmentImage} from '../garment-image';

export interface LookOption {slug: string; name: string; imageId: string; alt: string}

/** The three real catalogue looks, shown with their full-silhouette shoot photos. */
export function LookPicker({looks, value, onChange}: {looks: LookOption[]; value: string | null; onChange(slug: string): void}) {
  return <fieldset className="look-picker"><legend>Choose a look</legend><div className="look-options">
    {looks.map(l => <button key={l.slug} type="button" className="look-option" aria-pressed={value === l.slug} onClick={() => onChange(l.slug)}>
      <GarmentImage id={l.imageId} alt="" sizes="(max-width: 767px) 33vw, 200px"/><span>{l.name}</span>
    </button>)}
  </div></fieldset>;
}
