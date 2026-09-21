import type {Metadata} from 'next';
import Link from 'next/link';
import {articles} from '@/lib/journal';
import {GarmentImage} from '@/components/garment-image';
import {Arrow} from '@/components/icons';
export const metadata:Metadata={title:'Atelier notes',description:'Notes from Gulmohar on preparing a personal outfit brief and looking closely at garment details.'};
export default function Journal(){return <main id="main" className="page-width journal-page"><div className="page-heading"><p className="eyebrow">THE JOURNAL</p><h1>Atelier <em>notes.</em></h1><p>Help with choosing an outfit, comparing details and getting ready to order.</p></div><div className="journal-list">{articles.map((article,i)=><article key={article.slug}><Link href={`/journal/${article.slug}`}><GarmentImage id={article.image} alt={article.alt} sizes="(max-width:767px) 90vw, 40vw" eager={i===0}/></Link><p className="eyebrow">{article.category}</p><h2><Link href={`/journal/${article.slug}`}>{article.title}</Link></h2><Link className="text-link" href={`/journal/${article.slug}`}>Read the note <Arrow diagonal/></Link></article>)}</div></main>;}
