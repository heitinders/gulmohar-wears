import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {articles} from '@/lib/journal';
import {GarmentImage} from '@/components/garment-image';
import {whatsappUrl} from '@/lib/enquiries/messages';
import {Arrow} from '@/components/icons';
export const dynamicParams=false;
export function generateStaticParams(){return articles.map(a=>({slug:a.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const a=articles.find(a=>a.slug===slug);return {title:a?.title,description:a?.intro};}
export default async function Article({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const article=articles.find(a=>a.slug===slug);if(!article)notFound();return <main id="main" className="page-width article-page"><Link className="text-link" href="/journal">← All atelier notes</Link><header><p className="eyebrow">{article.category} / GULMOHAR WEARS</p><h1>{article.title}</h1><p>{article.intro}</p></header><GarmentImage id={article.image} alt={article.alt} eager/><div className="article-body">{article.sections.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}<a className="button button-primary" href={whatsappUrl()} target="_blank" rel="noopener noreferrer">Start your conversation <Arrow diagonal/></a></div></main>;}
