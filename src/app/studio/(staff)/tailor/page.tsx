import type {Metadata} from 'next';
import {TailorCompare} from '@/components/studio/tailor-compare';

export const metadata: Metadata = {title: 'Tailor'};
export default function Tailor() {
  return <main id="main" className="studio-page">
    <div><p className="eyebrow">STUDIO</p><h1>Tailor check</h1></div>
    <p className="fit-lede">Compare each draft value with the tape. Corrections are recorded on this device so the photo estimates can be improved later.</p>
    <TailorCompare/>
  </main>;
}
