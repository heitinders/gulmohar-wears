import { getCountries, getCountryCallingCode, isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

export type { CountryCode };
export type PhoneResult = { ok: true; e164: string; country: CountryCode } | { ok: false; reason: "empty" | "invalid"; countryName: string };

const names = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
export const countryName = (code: string) => names?.of(code) ?? code;

/** Default region India. A number typed with + keeps its own country whatever is selected. */
export function parsePhone(input: string, country: CountryCode): PhoneResult {
  const text = String(input ?? "").trim();
  const name = countryName(country);
  if (!text) return { ok: false, reason: "empty", countryName: name };
  try {
    const region = isSupportedCountry(country) ? country : undefined;
    const parsed = parsePhoneNumberFromString(text, region);
    if (!parsed || !parsed.isValid() || !parsed.country) return { ok: false, reason: "invalid", countryName: name };
    return { ok: true, e164: parsed.number, country: parsed.country };
  } catch {
    return { ok: false, reason: "invalid", countryName: name };
  }
}

export interface CountryOption { code: CountryCode; name: string; dial: string }
/** India first, then every other supported region by English name. */
export function countryOptions(): CountryOption[] {
  const all = getCountries().map(code => ({ code, name: countryName(code), dial: `+${getCountryCallingCode(code)}` }));
  const india = all.find(c => c.code === "IN")!;
  return [india, ...all.filter(c => c.code !== "IN").sort((a, b) => a.name.localeCompare(b.name, "en"))];
}

/** "+91 ••••••3210": enough for someone to recognise their own number, not enough to read it out. */
export function maskPhone(e164: string): string {
  const parsed = (() => { try { return parsePhoneNumberFromString(e164); } catch { return undefined; } })();
  if (!parsed) return "••••";
  const national = parsed.nationalNumber;
  return `+${parsed.countryCallingCode} ${"•".repeat(Math.max(national.length - 4, 2))}${national.slice(-4)}`;
}
