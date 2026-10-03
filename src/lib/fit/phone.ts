import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

// Display helpers, small enough for the browser. Validation needs full metadata and lives in phone-parse.ts (server).

export type { CountryCode };

const names = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
export const countryName = (code: string) => names?.of(code) ?? code;

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

/** "+91 90225 64907", for reading a number back to a client. Unparseable input is returned unchanged. */
export function formatPhone(e164: string): string {
  try { return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164; } catch { return e164; }
}
