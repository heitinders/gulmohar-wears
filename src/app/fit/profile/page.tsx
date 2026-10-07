import {connection} from 'next/server';
import {ProfileList} from '@/components/fit/profile-list';
import {FitGate} from '@/components/fit/fit-gate';
import {fitBackend} from '@/lib/fit/server/deps';
export const metadata={title:'Saved measures'};
const Heading=()=><div className="page-heading"><p className="eyebrow">FIND YOUR FIT</p><h1>Saved on <em>this phone.</em></h1><p>Your drafts stay in this browser so you need not re-photograph for every order. They are never uploaded.</p></div>;
export default async function Profile(){await connection();return <main id="main" className="page-width" style={{paddingBottom:'var(--chapter)'}}><Heading/><FitGate required={fitBackend()!=='off'} next="/fit/profile" fallback={null}><ProfileList/></FitGate></main>;}
