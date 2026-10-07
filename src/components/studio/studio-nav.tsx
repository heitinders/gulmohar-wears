'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BrandMark} from '../brand-mark';
import {studioSignOut} from '@/app/studio/actions';

const LINKS = [['/studio', 'Clients'], ['/studio/orders', 'Orders'], ['/studio/fit', 'Fit'], ['/studio/tailor', 'Tailor'], ['/studio/import', 'Import']] as const;

export function StudioNav({email}: {email: string}) {
  const path = usePathname();
  return <header className="studio-bar">
    <div className="studio-bar-inner">
      <Link href="/studio" aria-label="Studio home"><BrandMark compact eager/></Link>
      <nav aria-label="Studio"><ul>{LINKS.map(([href, label]) => <li key={href}><Link href={href} aria-current={(href === '/studio' ? path === href : path.startsWith(href)) ? 'page' : undefined}>{label}</Link></li>)}</ul></nav>
      <form action={studioSignOut} className="studio-signout"><span className="fit-note">{email}</span><button type="submit" className="text-link">Sign out</button></form>
    </div>
  </header>;
}
