import {ProfileList} from '@/components/fit/profile-list';
export const metadata={title:'Saved measures'};
export default function Profile(){return <main id="main" className="page-width" style={{paddingBottom:'var(--chapter)'}}><div className="page-heading"><p className="eyebrow">FIND YOUR FIT</p><h1>Saved on <em>this phone.</em></h1><p>Your drafts stay in this browser so you need not re-photograph for every order. They are never uploaded.</p></div><ProfileList/></main>;}
