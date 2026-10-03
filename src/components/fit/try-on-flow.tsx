'use client';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Arrow, MessageIcon} from '../icons';
import {LookPicker, type LookOption} from './look-picker';
import {TryOnPreview} from './try-on-preview';
import {browserClientTokenStore} from '@/lib/fit/client-token';
import {downscaleImage} from '@/lib/fit/image';
import {composeTryOnOrder, whatsappUrl} from '@/lib/enquiries/messages';
import type {Look} from '@/lib/catalogue';

type Problem = {kind: 'cap'; whatsapp: string} | {kind: 'retry'} | {kind: 'photo'} | {kind: 'blocked'} | {kind: 'unavailable'};
const SIZES = ['S', 'M', 'L', 'XL'];

/** Choose a look, add a photo, get an AI preview, then order on WhatsApp. The photo is sent once and kept nowhere. */
export function TryOnFlow({looks}: {looks: (LookOption & {look: Look})[]}) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null); const [photoName, setPhotoName] = useState('');
  const [busy, setBusy] = useState(false); const [problem, setProblem] = useState<Problem | null>(null);
  const [result, setResult] = useState<{url: string; slug: string} | null>(null);
  const [reported, setReported] = useState(false); const [liked, setLiked] = useState(false);
  const [choice, setChoice] = useState<'size' | 'mtm'>('size'); const [size, setSize] = useState('');
  const urlRef = useRef<string | null>(null);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  const chosen = looks.find(l => l.slug === (result?.slug ?? slug));

  async function addPhoto(file: File | undefined) {
    setProblem(null); setPhoto(null); setPhotoName('');
    if (!file) return;
    try { setPhoto(await downscaleImage(file)); setPhotoName(file.name); } catch { setProblem({kind: 'photo'}); }
  }

  async function make() {
    if (!slug || !photo) return;
    const store = browserClientTokenStore();
    setBusy(true); setProblem(null); setReported(false); setLiked(false);
    const body = new FormData(); body.append('token', store.get() ?? ''); body.append('look', slug); body.append('person', photo, 'person.jpg');
    try {
      const res = await fetch('/api/fit/try-on', {method: 'POST', body});
      if (res.ok) {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(await res.blob());
        setResult({url: urlRef.current, slug});
      } else {
        const json = await res.json().catch(() => ({})) as {error?: string; whatsapp?: string};
        if (res.status === 401) { store.clear(); router.replace('/fit/start?next=%2Ffit%2Ftry-on'); return; }
        setProblem(json.error === 'cap' ? {kind: 'cap', whatsapp: json.whatsapp ?? whatsappUrl()} : json.error === 'blocked' ? {kind: 'blocked'} : json.error === 'type' || json.error === 'too-large' ? {kind: 'photo'} : json.error === 'unavailable' ? {kind: 'unavailable'} : {kind: 'retry'});
      }
    } catch { setProblem({kind: 'retry'}); }
    setBusy(false);
  }

  async function report() {
    try { const r = await fetch('/api/fit/try-on/report', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({token: browserClientTokenStore().get()})}); setReported(r.ok); } catch { setReported(false); }
  }

  const tryAnother = () => { setResult(null); setSlug(null); setProblem(null); setLiked(false); };
  const order = chosen ? composeTryOnOrder({name: browserClientTokenStore().who()?.name ?? '', look: chosen.look, choice, size}) : '';

  return <main id="main" className="fit-step tryon" data-clarity-mask="true">
    <div><p className="eyebrow draft-eyebrow">TRY IT ON</p><h1>Try a look on</h1></div>
    {!result && <>
      <p className="fit-lede">Choose one of our suits and add a full-length photo of yourself. We make a preview of you wearing it. It is an AI picture, so the garment in your order will be the real one from our photos.</p>
      <LookPicker looks={looks} value={slug} onChange={s => { setSlug(s); setProblem(null); }}/>
      <div className="fit-field">
        <label htmlFor="tryon-photo">Your photo</label>
        <input id="tryon-photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-describedby="tryon-photo-hint" onChange={e => addPhoto(e.target.files?.[0])}/>
        <span id="tryon-photo-hint" className="fit-note">Standing, full length, in good light against a plain wall. It is sent once to make the preview and is not kept by us.{photoName ? ` Ready: ${photoName}.` : ''}</span>
      </div>
      <button type="button" className="button button-primary" disabled={!slug || !photo || busy} onClick={make}>{busy ? 'Making your preview' : 'Make my preview'} <Arrow/></button>
    </>}
    <p className="fit-note" role="status">{busy ? 'Making your preview. This can take up to a minute.' : reported ? "Thank you. We'll look at this preview." : ''}</p>
    {problem && <div className="fit-error" role="alert">
      {problem.kind === 'cap' && <>You&apos;ve used today&apos;s previews. Message us on WhatsApp and we&apos;ll help. <a className="text-link" href={problem.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp us <Arrow diagonal/></a></>}
      {problem.kind === 'retry' && <>The preview didn&apos;t work this time, and it didn&apos;t count against today&apos;s previews. <button type="button" className="text-link" onClick={make}>Try again</button></>}
      {problem.kind === 'blocked' && <>We couldn&apos;t make a preview from this photo. Try another one: standing, full length, plain background.</>}
      {problem.kind === 'photo' && <>This photo couldn&apos;t be used. Try a JPEG or PNG photo from your gallery.</>}
      {problem.kind === 'unavailable' && <>Previews are not available just now. <a className="text-link" href={whatsappUrl('Hi Gulmohar, I would like help choosing a look.')} target="_blank" rel="noopener noreferrer">WhatsApp us <Arrow diagonal/></a></>}
    </div>}
    {result && chosen && <section className="tryon-result" aria-labelledby="tryon-result-title">
      <h2 id="tryon-result-title">{chosen.name}</h2>
      <TryOnPreview src={result.url} lookName={chosen.name}/>
      <div className="chips"><button type="button" className="button button-primary" onClick={() => setLiked(true)}>I like this</button><button type="button" className="button button-outline" onClick={tryAnother}>Try another look</button><button type="button" className="text-link" onClick={report}>Report this preview</button></div>
      {liked && <div className="fit-panel">
        <fieldset><legend>How would you like it made?</legend><div className="tryon-choice">
          <label className="consent-check"><input type="radio" name="made" checked={choice === 'size'} onChange={() => setChoice('size')}/><span>Ready size</span></label>
          <label className="consent-check"><input type="radio" name="made" checked={choice === 'mtm'} onChange={() => setChoice('mtm')}/><span>Made to measure</span></label>
        </div></fieldset>
        {choice === 'size' && <div className="fit-field"><label htmlFor="tryon-size">Size</label><select id="tryon-size" value={size} onChange={e => setSize(e.target.value)}><option value="">Help me choose</option>{SIZES.map(s => <option key={s}>{s}</option>)}</select></div>}
        <a className="button button-primary" href={whatsappUrl(order)} target="_blank" rel="noopener noreferrer"><MessageIcon/> Order on WhatsApp <Arrow diagonal/></a>
        <p className="field-hint">Opens WhatsApp with your message ready. Nothing is sent until you press send.</p>
      </div>}
    </section>}
  </main>;
}
