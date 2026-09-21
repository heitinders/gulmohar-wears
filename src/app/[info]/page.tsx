import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {information} from '@/lib/information';
import {brand} from '@/lib/brand';
import {whatsappUrl} from '@/lib/enquiries/messages';
import {Arrow} from '@/components/icons';
export const dynamicParams=false;
export function generateStaticParams(){return Object.keys(information).map(info=>({info}));}
export async function generateMetadata({params}:{params:Promise<{info:string}>}):Promise<Metadata>{const {info}=await params;return {title:information[info]?.title,description:information[info]?.intro};}
export default async function Info({params}:{params:Promise<{info:string}>}){const {info}=await params;const entry=information[info];if(!entry)notFound();return <main id="main" className="page-width information-page"><div className="page-heading"><p className="eyebrow">GULMOHAR / AT YOUR SERVICE</p><h1>{entry.title}</h1><p>{entry.intro}</p></div><div className="information-layout"><div className="information-sections">{entry.sections.map(([title,text])=>info==='faq'?<details key={title}><summary>{title}</summary><p>{text}</p></details>:<section key={title}><h2>{title}</h2><p>{text}</p></section>)}</div><aside className="contact-aside"><p className="eyebrow">THE ATELIER, DIRECTLY</p><a className="button button-primary" href={whatsappUrl()} target="_blank" rel="noopener noreferrer">WhatsApp <Arrow diagonal/></a><a className="text-link" href={brand.instagramDm} target="_blank" rel="noopener noreferrer">Instagram <Arrow diagonal/></a><a href={brand.telephone}>{brand.phone}</a><p>Mohali, Punjab, India</p><Link className="text-link" href="/custom">Prepare an enquiry <Arrow diagonal/></Link></aside></div></main>;}
