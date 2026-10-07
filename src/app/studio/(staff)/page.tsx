import type {Metadata} from 'next';
import {staffOrRedirect} from '../session';
import {ClientList} from '@/components/studio/client-list';
import type {ClientRow} from '@/lib/fit/server/store';

export const metadata: Metadata = {title: 'Clients'};

export default async function Clients() {
  const staff = await staffOrRedirect();
  let rows: ClientRow[] | null = null;
  try { rows = await staff.deps.studioData(staff.accessToken).listClients(); } catch { rows = null; }
  return <main id="main" className="studio-page">
    <div><p className="eyebrow">STUDIO</p><h1>Clients</h1></div>
    <p className="fit-lede">Everyone who started Find your fit and agreed to share their details. Tap a number to open the WhatsApp chat.</p>
    {rows ? <ClientList rows={rows} empty="No clients yet. They appear here after the consent step."/> : <p className="fit-error">The client list could not be loaded just now. Refresh to try again.</p>}
  </main>;
}
