import type {Metadata} from 'next';
import {connection} from 'next/server';
import {FocusBar} from '@/components/fit/focus-bar';
import {FitGate} from '@/components/fit/fit-gate';
import {TryOnFlow} from '@/components/fit/try-on-flow';
import {Arrow} from '@/components/icons';
import {fitBackend, tryOnConfig} from '@/lib/fit/server/config';
import {looks} from '@/lib/catalogue';
import {whatsappUrl} from '@/lib/enquiries/messages';

export const metadata: Metadata = {title: 'Try a look on'};
const Waiting = () => <main id="main" className="fit-step"><h1>Try a look on</h1></main>;

export default async function TryOn() {
  await connection();
  if (!tryOnConfig().available) return <FocusBar backHref="/fit" backLabel="Back"><main id="main" className="fit-step">
    <div><p className="eyebrow draft-eyebrow">TRY IT ON</p><h1>Try a look on</h1></div>
    <p className="fit-lede">Previews are not open yet. Message us and we will send photos of the look you like, worn and up close.</p>
    <a className="button button-primary" href={whatsappUrl('Hi Gulmohar, I would like help choosing a look.')} target="_blank" rel="noopener noreferrer">WhatsApp us <Arrow diagonal/></a>
  </main></FocusBar>;
  const options = looks.map(look => { const image = look.images.find(i => i.caption === 'The full silhouette') ?? look.images[0]; return {slug: look.slug, name: look.name, imageId: image.id, alt: image.alt, look}; });
  return <FocusBar backHref="/fit" backLabel="Back"><FitGate required={fitBackend() !== 'off'} next="/fit/try-on" fallback={<Waiting/>}><TryOnFlow looks={options}/></FitGate></FocusBar>;
}
