'use client';
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Arrow} from '../icons';
import {PhoneField} from './phone-field';
import {CONSENT_TEXT, CONSENT_VERSION} from '@/lib/fit/consent';
import {maskPhone, type CountryOption} from '@/lib/fit/phone';
import {browserClientTokenStore, type ClientWho} from '@/lib/fit/client-token';
import {whatsappUrl} from '@/lib/enquiries/messages';
import {checkFitToken, registerFitClient} from '@/app/fit/actions';

type Errors = {name?: string; phone?: string; consent?: string; form?: 'rate' | 'unavailable'};

/** Name, phone and consent before measuring (spec 4.1). A phone that already holds a valid token is welcomed back instead. */
export function ConsentGate({countries, next}: {countries: CountryOption[]; next: string}) {
  const router = useRouter();
  const [mode, setMode] = useState<'checking' | 'welcome' | 'form'>('checking');
  const [who, setWho] = useState<ClientWho | null>(null);
  const [name, setName] = useState(''); const [country, setCountry] = useState('IN'); const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false); const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({}); const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const store = browserClientTokenStore(); const token = store.get();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token is only readable after mount.
    if (!token) { setMode('form'); return; }
    let live = true;
    checkFitToken(token).then(r => {
      if (!live) return;
      if (r.ok) { setWho({name: r.name, phoneMasked: r.phoneMasked}); setMode('welcome'); }
      else if (r.error === 'invalid-token') { store.clear(); setMode('form'); }
      else { const local = store.who(); if (local) { setWho(local); setMode('welcome'); } else setMode('form'); }
    }).catch(() => { if (!live) return; const local = store.who(); if (local) { setWho(local); setMode('welcome'); } else setMode('form'); });
    return () => { live = false; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: Errors = {};
    if (!name.trim()) found.name = 'Tell us your name so we know who we are talking to.';
    if (!phone.trim()) found.phone = 'Enter your phone or WhatsApp number.';
    if (!consent) found.consent = 'Please tick the box to agree before we continue.';
    setErrors(found);
    if (Object.keys(found).length) { (document.getElementById(found.name ? 'gate-name' : found.phone ? 'gate-phone' : 'gate-consent') as HTMLElement | null)?.focus(); return; }
    setBusy(true);
    try {
      const r = await registerFitClient({name, phone, country, consent, consentVersion: CONSENT_VERSION, website});
      if (r.ok) {
        browserClientTokenStore().set(r.token, {name: r.name, phoneMasked: r.phone ? maskPhone(r.phone) : ''});
        router.push(next); return;
      }
      if (r.error === 'name') { setErrors({name: 'Use between 1 and 80 characters for your name.'}); nameRef.current?.focus(); }
      else if (r.error === 'phone') { setErrors({phone: `That doesn't look like a valid number for ${r.countryName}.`}); document.getElementById('gate-phone')?.focus(); }
      else if (r.error === 'consent') setErrors({consent: 'Please tick the box to agree before we continue.'});
      else setErrors({form: r.error === 'rate' ? 'rate' : 'unavailable'});
    } catch {
      setErrors({form: 'unavailable'});
    }
    setBusy(false);
  }

  function useAnother() { browserClientTokenStore().clear(); setWho(null); setMode('form'); }

  if (mode === 'checking') return <main id="main" className="fit-step"><h1>Before we measure</h1></main>;
  if (mode === 'welcome' && who) return <main id="main" className="fit-step gate">
    <div><p className="eyebrow draft-eyebrow">FIND YOUR FIT</p><h1>Welcome back, {who.name}.</h1></div>
    <p className="fit-lede">We have your details for <span className="nowrap">{who.phoneMasked}</span>. Carry on where you left off.</p>
    <div className="fit-actions gate-actions"><Link className="button button-primary" href={next}>Continue <Arrow/></Link><button type="button" className="text-link" onClick={useAnother}>Not you? Use another number</button></div>
  </main>;
  return <main id="main" className="fit-step gate">
    <div><p className="eyebrow draft-eyebrow">FIND YOUR FIT</p><h1>Before we measure</h1></div>
    <p className="fit-lede">Tell us who you are so the atelier can recognise your draft when it arrives on WhatsApp. Your photos and sizes stay on this phone.</p>
    <form className="fit-form" onSubmit={submit} noValidate>
      <div className="fit-field">
        <label htmlFor="gate-name">Your name</label>
        <input id="gate-name" ref={nameRef} name="name" autoComplete="name" required maxLength={80} value={name} aria-describedby="gate-name-error" aria-invalid={errors.name ? true : undefined} onChange={e => setName(e.target.value)}/>
        <p id="gate-name-error" className="fit-error" role="alert" hidden={!errors.name}>{errors.name}</p>
      </div>
      <PhoneField countries={countries} country={country} phone={phone} error={errors.phone ?? null} onCountry={setCountry} onPhone={setPhone}/>
      <div className="fit-honeypot" aria-hidden="true"><label htmlFor="gate-website">Website</label><input id="gate-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)}/></div>
      <div className="fit-field consent-field">
        <label className="consent-check" htmlFor="gate-consent"><input id="gate-consent" type="checkbox" checked={consent} aria-describedby="gate-consent-error" aria-invalid={errors.consent ? true : undefined} onChange={e => setConsent(e.target.checked)}/><span>{CONSENT_TEXT}</span></label>
        <Link className="text-link" href="/privacy#find-your-fit">How we use your details</Link>
        <p id="gate-consent-error" className="fit-error" role="alert" hidden={!errors.consent}>{errors.consent}</p>
      </div>
      <p className="fit-error" role="alert" hidden={!errors.form}>{errors.form === 'rate' ? 'Too many tries from this connection. Please wait a little and try again, or message us on WhatsApp.' : "We couldn't save your details just now. Try again, or message us on WhatsApp."}{errors.form && <> <a className="text-link" href={whatsappUrl('Hi Gulmohar, I would like help with my measurements.')} target="_blank" rel="noopener noreferrer">WhatsApp us <Arrow diagonal/></a></>}</p>
      <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saving' : 'Continue'} <Arrow/></button>
    </form>
  </main>;
}
