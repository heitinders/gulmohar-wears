'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {brand} from '@/lib/brand';
import {looks} from '@/lib/catalogue';
import {whatsappUrl} from '@/lib/enquiries/messages';
import {Arrow} from './icons';
import {BrandMark} from './brand-mark';
import {GarmentImage} from './garment-image';

const links = [['Home', '/'], ['Collections', '/collections'], ['Find your fit', '/fit'], ['Custom orders', '/custom'], ['Our atelier', '/atelier'], ['Journal', '/journal']];
const categories = [['Suits', '/collections/suits', 'See the full looks and details'], ['Wedding wear', '/collections/wedding-wear', 'For the wedding and its celebrations'], ['Custom lehengas', '/collections/lehengas', 'Tell us what you have in mind']];

export function Navigation() {
  const path = usePathname();
  const header = useRef<HTMLElement>(null);
  const collectionTrigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const productTrigger = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<'collections' | 'products' | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!panel) return;
    function outside(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) setPanel(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        (panel === 'products' ? productTrigger : collectionTrigger).current?.focus();
        setPanel(null);
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [panel]);

  const closeCollection = () => setPanel(null);
  const toggle = (name: 'collections' | 'products') => setPanel(panel === name ? null : name);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header" ref={header} onBlur={event => {
      if (panel && !event.currentTarget.contains(event.relatedTarget as Node)) closeCollection();
    }}>
      <nav className="nav-inner" aria-label="Main navigation">
        <Link href="/" className="brand-home" aria-label="Gulmohar Wears home" onClick={closeCollection}><BrandMark compact eager/></Link>
        <div className="desktop-links">
          <Link href="/" onClick={closeCollection} aria-current={path === '/' ? 'page' : undefined}>Home</Link>
          <button className="collection-trigger" ref={collectionTrigger} aria-expanded={panel === 'collections'} aria-controls="collection-menu" onClick={() => toggle('collections')}>
            Collections <span className="nav-chevron" aria-hidden="true"/>
          </button>
          <button className="collection-trigger" ref={productTrigger} aria-expanded={panel === 'products'} aria-controls="product-menu" onClick={() => toggle('products')}>
            Products <span className="nav-chevron" aria-hidden="true"/>
          </button>
          {links.slice(2).map(([label, href]) => <Link key={href} href={href} onClick={closeCollection} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}
        </div>
        <div className="nav-right">
          <a className="nav-enquire" href={whatsappUrl()} target="_blank" rel="noopener noreferrer"><span>Let&apos;s talk</span><Arrow diagonal/></a>
          <button className="menu-trigger" aria-label="Open menu" aria-expanded={open} aria-controls="mobile-menu" ref={trigger} onClick={() => {
            closeCollection(); dialog.current?.showModal(); setOpen(true); closeButton.current?.focus();
          }}><span/><span/></button>
        </div>
      </nav>
      <div className="collection-menu" id="collection-menu" hidden={panel !== 'collections'}>
        <div className="collection-menu-inner">
          <div className="collection-menu-links">
            <p className="eyebrow">FIND YOUR OUTFIT</p>
            {categories.map(([label, href, note]) => <Link href={href} key={href} onClick={closeCollection}><span><strong>{label}</strong><small>{note}</small></span><Arrow diagonal/></Link>)}
            <Link className="text-link" href="/collections" onClick={closeCollection}>View all looks <Arrow/></Link>
          </div>
          <Link className="nav-look" href="/products/olive-gold-suit" onClick={closeCollection}><GarmentImage id="dsc07053" alt="Olive-gold embroidered suit" sizes="240px"/><span>Olive gold <Arrow diagonal/></span></Link>
          <Link className="nav-look nav-look-detail" href="/products/fuchsia-suit" onClick={closeCollection}><GarmentImage id="dsc06973" alt="Fuchsia suit neckline and cuff detail" sizes="240px"/><span>Fuchsia, up close <Arrow diagonal/></span></Link>
        </div>
        <div className="collection-menu-note"><span>Made to order in Mohali, Punjab.</span><span>Worldwide shipping</span></div>
      </div>
      <div className="collection-menu" id="product-menu" hidden={panel !== 'products'}>
        <div className="product-menu-inner">
          <p className="eyebrow">THE LOOKS</p>
          <ul className="product-menu-list">{looks.map(look => <li key={look.slug}><Link className="nav-look" href={`/products/${look.slug}`} aria-current={path === `/products/${look.slug}` ? 'page' : undefined} onClick={closeCollection}><GarmentImage id={look.images[0].id} alt="" sizes="200px"/><span>{look.name} <Arrow diagonal/></span></Link></li>)}</ul>
        </div>
        <div className="collection-menu-note"><span>Made to order in Mohali, Punjab.</span><Link href="/collections" onClick={closeCollection}>View all looks</Link></div>
      </div>
    </header>
    <dialog id="mobile-menu" className="mobile-menu" ref={dialog} aria-label="Navigation menu" onClose={() => {setOpen(false); trigger.current?.focus();}}>
      <div className="menu-top"><BrandMark compact/><button ref={closeButton} className="plain-control" onClick={() => dialog.current?.close()}>Close ×</button></div>
      <p className="mobile-menu-intro eyebrow">MADE TO ORDER IN MOHALI</p>
      <nav aria-label="Mobile navigation">{links.map(([label, href], i) => <Link href={href} key={href} aria-current={path === href ? 'page' : undefined} onClick={() => dialog.current?.close()}><span className="eyebrow">0{i + 1}</span>{label}<Arrow diagonal/></Link>)}</nav>
      <div className="mobile-menu-products"><p className="eyebrow">PRODUCTS</p><ul>{looks.map(look => <li key={look.slug}><Link href={`/products/${look.slug}`} aria-current={path === `/products/${look.slug}` ? 'page' : undefined} onClick={() => dialog.current?.close()}>{look.name}<Arrow diagonal/></Link></li>)}</ul></div>
      <Link className="mobile-menu-look" href="/products/fuchsia-suit" onClick={() => dialog.current?.close()}><GarmentImage id="dsc06973" alt="Fuchsia suit embroidery detail" sizes="120px"/><span><small>FROM THE COLLECTION</small>Take a closer look<Arrow diagonal/></span></Link>
      <a className="button button-primary" href={whatsappUrl()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <Arrow diagonal/></a>
      <a className="text-link" href={brand.instagramDm} target="_blank" rel="noopener noreferrer">Message on Instagram <Arrow diagonal/></a>
      <p>Mohali, Punjab · Worldwide shipping</p>
    </dialog>
  </>;
}
