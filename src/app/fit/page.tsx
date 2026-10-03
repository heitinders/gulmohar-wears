import Link from 'next/link';
import {Arrow} from '@/components/icons';
import {whatsappUrl} from '@/lib/enquiries/messages';

export default function FitIntro() {
  return <main id="main" className="page-width">
    <div className="page-heading">
      <p className="eyebrow">FIND YOUR FIT</p>
      <h1>Find your <em>Gulmohar fit.</em></h1>
      <p>Two photos and your height give us a draft of your measurements. One tape measurement makes them closer. Our tailor checks every number before cutting fabric.</p>
      <Link className="button button-primary" href="/fit/start">Start my fit <Arrow/></Link>
    </div>
    <section className="personal-process" aria-labelledby="fit-how">
      <div className="process-heading">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2 id="fit-how">Three steps, about five minutes.</h2>
        <p>Everything happens on your phone. Your photos and your sizes stay on this device until you choose to send them to us on WhatsApp.</p>
      </div>
      <ol className="process-list">
        <li><span className="eyebrow">01</span><div><h3>Measure</h3><p>Pick your silhouette, enter your height, then take a front and a side photo in fitted clothes against a plain wall.</p></div></li>
        <li><span className="eyebrow">02</span><div><h3>Correct with one tape</h3><p>Measure your bust or waist once with a tape. Every other girth adjusts to it.</p></div></li>
        <li><span className="eyebrow">03</span><div><h3>Our tailor verifies</h3><p>Send the draft to us on WhatsApp. We confirm the numbers with you before anything is cut.</p></div></li>
      </ol>
    </section>
    <section className="fit-intro-details">
      <details><summary>How accurate is this?</summary><p>Your photos give us a starting point, not a final cut. Measurements from photos can be off by an inch or two, sometimes more. One tape measurement of your bust or waist brings them much closer. Our tailor checks every number before cutting fabric.</p></details>
      <details><summary>What happens to my photos?</summary><p>They are read on your phone and never uploaded. Nothing is stored unless you tap Save to this phone, and even then it stays in this browser only.</p></details>
      <p className="fit-note">Prefer to talk first? <a className="text-link" href={whatsappUrl('Hi Gulmohar, I would like help with my measurements.')} target="_blank" rel="noopener noreferrer">Message us on WhatsApp <Arrow diagonal/></a></p>
    </section>
  </main>;
}
