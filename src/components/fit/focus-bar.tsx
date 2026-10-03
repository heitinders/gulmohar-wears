import Link from 'next/link';
import {BrandMark} from '../brand-mark';

/** The focused shell: a slim bar with a way back and the lockup. Hides the site chrome via body:has(.fit-focus). */
export function FocusBar({backHref, backLabel, children}: {backHref: string; backLabel: string; children: React.ReactNode}) {
  return <div className="fit-focus">
    <header className="focus-bar"><div className="focus-bar-inner"><Link className="focus-back" href={backHref}>← {backLabel}</Link><Link href="/" aria-label="Gulmohar Wears home"><BrandMark compact eager/></Link></div></header>
    {children}
  </div>;
}
