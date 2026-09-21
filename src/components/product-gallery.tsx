'use client';
import {useState} from 'react';
import type {Look} from '@/lib/catalogue';
import {GarmentImage} from './garment-image';
export function ProductGallery({look}:{look:Look}){const [selected,setSelected]=useState(0);const image=look.images[selected];return <div className="product-gallery"><div className="gallery-main" aria-live="polite"><GarmentImage id={image.id} alt={image.alt} eager sizes="(max-width: 767px) 100vw, 54vw"/><span className="gallery-count">{selected+1} / {look.images.length}</span></div><div className="gallery-thumbs" aria-label="Choose a garment view">{look.images.map((item,i)=><button key={item.id} aria-label={`View ${item.caption.toLowerCase()}`} aria-pressed={selected===i} onClick={()=>setSelected(i)}><GarmentImage id={item.id} alt="" sizes="100px"/></button>)}</div><p className="image-caption">{image.caption}</p></div>;}
