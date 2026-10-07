import 'server-only';
import {staffOrRedirect} from './session';

/** Name and phone of every client, for the studio's client pickers. Null when the list cannot be loaded. */
export async function clientOptions(): Promise<{phone: string; name: string}[] | null> {
  const staff = await staffOrRedirect();
  try { return (await staff.deps.studioData(staff.accessToken).listClients()).map(c => ({phone: c.phone, name: c.name})); } catch { return null; }
}
