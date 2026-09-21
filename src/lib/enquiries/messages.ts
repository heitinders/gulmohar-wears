import { brand } from "../brand.ts";

/** CRM-neutral: no provider fields, credentials or transport in the UI model. */
export interface Enquiry {
  version: 1;
  name: string;
  occasion: string;
  eventDate?: string;
  destination?: string;
  fabric?: string;
  notes?: string;
  productReference?: string;
  source: string;
}

const clean = (value: string) => value.trim().replace(/[\r\n]+/g, " ");

export function composeEnquiry(enquiry: Enquiry): string {
  const lines = [
    `Hi Gulmohar, I’m ${clean(enquiry.name)}. I’d like to discuss an outfit.`,
    `Occasion: ${clean(enquiry.occasion)}`,
  ];
  const details = [
    ["Event date", enquiry.eventDate], ["Deliver to", enquiry.destination],
    ["Fabric preference", enquiry.fabric], ["Piece reference", enquiry.productReference],
    ["Notes", enquiry.notes],
  ];
  for (const [label, value] of details) {
    if (value?.trim()) lines.push(`${label}: ${clean(value)}`);
  }
  lines.push("Please help me with the design, fit, price and delivery timeline.");
  return lines.join("\n");
}

export function whatsappUrl(message = "Hi Gulmohar, I would like to enquire about a custom outfit."): string {
  return `${brand.whatsappBase}?text=${encodeURIComponent(message)}`;
}
