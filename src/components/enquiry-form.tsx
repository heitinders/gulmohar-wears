"use client";

import { useState, type FormEvent } from "react";
import { brand } from "@/lib/brand";
import { composeEnquiry, whatsappUrl } from "@/lib/enquiries/messages";
import { Arrow, MessageIcon } from "./icons";

const fabrics = ["Silk", "Georgette", "Organza", "Velvet", "Chanderi", "Help me choose"];

export function EnquiryForm({productReference, source = "/custom"}: {productReference?:string;source?:string}) {
  const [fabric, setFabric] = useState("Help me choose");
  const [message, setMessage] = useState("");

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    if (!value("name")) {
      const input = event.currentTarget.elements.namedItem("name") as HTMLInputElement;
      input.setCustomValidity("Please enter your name."); input.reportValidity(); return;
    }
    setMessage(composeEnquiry({
      version: 1, name: value("name"), occasion: value("occasion"),
      eventDate: value("eventDate"), destination: value("destination"),
      fabric, notes: value("notes"), source, productReference,
    }));
  }

  return <form className="enquiry-form" onSubmit={prepare} onChange={() => setMessage("")}>
    <div className="field-grid">
      <label>Your name <span aria-hidden="true">*</span><input name="name" autoComplete="name" required maxLength={100} placeholder="Your first name" onInput={event => event.currentTarget.setCustomValidity("")} /></label>
      <label>The occasion <span aria-hidden="true">*</span><select name="occasion" required defaultValue=""><option value="" disabled>Select your occasion</option><option>Wedding</option><option>Wedding guest</option><option>Celebration</option><option>Everyday dressing</option><option>Something else</option></select></label>
      <label>Occasion date <span className="optional">Optional</span><input type="date" name="eventDate" /></label>
      <label>City and country <span className="optional">Optional</span><input name="destination" maxLength={150} placeholder="For example, Toronto, Canada" /></label>
    </div>
    <fieldset><legend>A fabric in mind? <span className="optional">Optional</span></legend><div className="chips">{fabrics.map(item => <button className="chip" type="button" key={item} aria-pressed={fabric === item} onClick={() => { setFabric(item); setMessage(""); }}>{item}</button>)}</div></fieldset>
    <label>What do you have in mind? <span className="optional">Optional</span><textarea name="notes" rows={4} maxLength={1000} placeholder="Tell us about the style or colour you’d like." /><span className="field-hint">Have a reference image? Attach it in your WhatsApp conversation.</span></label>
    <p className="form-note">The form keeps your details in this browser. Opening WhatsApp shares the prepared text with WhatsApp; you choose whether to send it to us. Preparing an enquiry does not place an order.</p>
    <button className="button button-primary" type="submit">Prepare my enquiry <Arrow /></button>
    <div aria-live="polite" aria-atomic="true">{message && <section className="message-preview" aria-label="Your enquiry preview">
      <p className="eyebrow">YOUR MESSAGE</p><h3>Check your message before sending.</h3>
      <p className="preserve-lines">{message}</p>
      <a className="button button-primary" href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer"><MessageIcon /> Continue to WhatsApp</a>
      <p className="field-hint">Opens WhatsApp in a new tab. Review there and press send.</p>
    </section>}</div>
    <a className="text-link" href={brand.instagramDm} target="_blank" rel="noopener noreferrer">Prefer Instagram? Message us there <Arrow diagonal /></a>
  </form>;
}
