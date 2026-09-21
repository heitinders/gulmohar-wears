import type {Metadata} from 'next';
import Link from 'next/link';
import {LookList} from '@/components/look-list';
import {Invitation} from '@/components/footer';
export const metadata:Metadata={title:'The current edit',description:'Explore three photographed Gulmohar suit looks in olive gold, fuchsia and blue. Enquire for fabric, fit, price and delivery.'};
export default function Collections(){return <main id="main"><section className="page-width collection-page"><div className="page-heading"><p className="eyebrow">THE GULMOHAR EDIT</p><h1>Find your<br/><em>next outfit.</em></h1><p>Browse the full looks and close-ups. If one catches your eye, ask us about the fabric, price or changes you have in mind.</p></div><nav className="collection-tabs" aria-label="Collection categories"><Link href="/collections" aria-current="page">All looks</Link><Link href="/collections/suits">Suits</Link><Link href="/collections/wedding-wear">Wedding wear</Link><Link href="/collections/lehengas">Custom lehengas</Link></nav><LookList/></section><Invitation/></main>;}
