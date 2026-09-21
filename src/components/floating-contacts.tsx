'use client';

import {usePathname} from 'next/navigation';
import {findLook, lookMessage} from '@/lib/catalogue';
import {whatsappUrl} from '@/lib/enquiries/messages';
import {brand} from '@/lib/brand';
import {InstagramIcon, MessageIcon} from './icons';

export function FloatingContacts() {
  const pathname = usePathname();
  const look = pathname.startsWith('/products/')
    ? findLook(pathname.split('/')[2])
    : undefined;

  return <nav className="floating-contacts" aria-label="Contact Gulmohar">
    <a className="social-float instagram-float" href={brand.instagramDm} target="_blank" rel="noopener noreferrer"
      aria-label="Message us on Instagram (opens in a new tab)">
      <span className="social-float-label">Message us on Instagram</span>
      <span className="social-float-orb"><InstagramIcon/></span>
    </a>
    <a
    className="social-float whatsapp-float"
    href={whatsappUrl(look ? lookMessage(look) : undefined)}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={look ? `Chat on WhatsApp about the ${look.name} (opens in a new tab)` : 'Chat on WhatsApp (opens in a new tab)'}
  >
    <span className="social-float-label">Chat on WhatsApp</span>
    <span className="social-float-orb"><MessageIcon/></span>
  </a></nav>;
}
