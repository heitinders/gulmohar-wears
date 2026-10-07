import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { countryName } from "./phone.ts";

// Server-side validation with full metadata: the min build only checks length, which accepts numbers that
// cannot exist (+91 12345 67890) and numbers typed under the wrong country.

export type PhoneResult = { ok: true; e164: string; country: CountryCode } | { ok: false; reason: "empty" | "invalid"; countryName: string };

/** Default region India. A number typed with + or an exit code keeps its own country whatever is selected. */
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
