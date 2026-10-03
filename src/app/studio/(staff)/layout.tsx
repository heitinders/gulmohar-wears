import {connection} from 'next/server';
import {StudioNav} from '@/components/studio/studio-nav';
import {staffOrRedirect} from '../session';

export default async function StaffLayout({children}: {children: React.ReactNode}) {
  await connection();
  const staff = await staffOrRedirect();
  return <><StudioNav email={staff.user.email}/>{children}</>;
}
