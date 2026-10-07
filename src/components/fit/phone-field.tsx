'use client';
import type {CountryOption} from '@/lib/fit/phone';

/** Country picker (India first) beside a phone input. The selected dial code is printed so a foreign number is not mistaken for an Indian one. */
export function PhoneField({countries, country, phone, error, onCountry, onPhone}: {countries: CountryOption[]; country: string; phone: string; error: string | null; onCountry(c: string): void; onPhone(p: string): void}) {
  const dial = countries.find(c => c.code === country)?.dial ?? '';
  return <div className="fit-field">
    <label htmlFor="gate-country">Country</label>
    <select id="gate-country" name="country" autoComplete="country" value={country} onChange={e => onCountry(e.target.value)}>
      {countries.map(c => <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>)}
    </select>
    <label htmlFor="gate-phone">Phone or WhatsApp number</label>
    <div className="phone-input"><span aria-hidden="true">{dial}</span><input id="gate-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} aria-describedby="gate-phone-hint gate-phone-error" aria-invalid={error ? true : undefined} onChange={e => onPhone(e.target.value)}/></div>
    <span id="gate-phone-hint" className="fit-note">We use it to find your details when you message us. Numbers outside {countries.find(c => c.code === country)?.name ?? 'this country'} can start with + and the country code.</span>
    <p id="gate-phone-error" className="fit-error" role="alert" hidden={!error}>{error}</p>
  </div>;
}
