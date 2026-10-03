import type {Metadata} from 'next';
import {ImportCode} from '@/components/studio/import-code';
import {clientOptions} from '../../client-options';

export const metadata: Metadata = {title: 'Import'};
export default async function Import() {
  const clients = await clientOptions();
  return <main id="main" className="studio-page">
    <div><p className="eyebrow">STUDIO</p><h1>Import a draft code</h1></div>
    <p className="fit-lede">Paste the code from the end of a customer&apos;s WhatsApp message. The measures are saved against the client on this device only.</p>
    <ImportCode clients={clients}/>
  </main>;
}
