import type {Metadata} from 'next';
import {staffOrRedirect} from '../../session';
import {ClientList} from '@/components/studio/client-list';
import {listOrders} from '@/lib/fit/studio-view';
import type {ClientRow} from '@/lib/fit/server/store';

export const metadata: Metadata = {title: 'Orders'};

export default async function Orders() {
  const staff = await staffOrRedirect();
  let rows: ClientRow[] | null = null;
  try { rows = listOrders(await staff.deps.studioData(staff.accessToken).listClients()); } catch { rows = null; }
  return <main id="main" className="studio-page">
    <div><p className="eyebrow">STUDIO</p><h1>Orders</h1></div>
    <p className="fit-lede">Clients who added order details, soonest deadline first.</p>
    {rows ? <ClientList rows={rows} deadlineFirst empty="No order briefs yet."/> : <p className="fit-error">Orders could not be loaded just now. Refresh to try again.</p>}
  </main>;
}
