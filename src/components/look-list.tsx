import Link from 'next/link';
import {looks} from '@/lib/catalogue';
import {GarmentImage} from './garment-image';
import {Arrow} from './icons';
export function LookList(){return <div className="look-list">{looks.map(look=><figure key={look.slug}><Link href={`/products/${look.slug}`}><GarmentImage id={look.images[0].id} alt={look.images[0].alt} sizes="(max-width:767px) 44vw, 30vw"/></Link><figcaption><span>LOOK {look.number}</span><Link href={`/products/${look.slug}`}>{look.name}<Arrow diagonal/></Link></figcaption></figure>)}</div>;}
