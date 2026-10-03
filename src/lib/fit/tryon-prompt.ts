import type { Look } from "../catalogue.ts";

/** Bump whenever the wording changes, so a preview can be traced to the prompt that made it. */
export const TRYON_PROMPT_VERSION = "tryon-2026-10-03";

/** Spec 4.6: change only the clothing, keep the person exactly as photographed, keep the garment exactly as made. */
export function buildTryOnPrompt(look: Look): string {
  return [
    "You are given two images. The first is a photograph of a person. The second is a catalogue photograph of a Punjabi suit from Gulmohar Wears: " + look.name + ".",
    "Dress the person in the first image in the outfit from the second image: the kameez, the dupatta and the trousers.",
    "Change only the clothing. Keep the person's face, skin tone, hair, body shape, proportions, pose, hands and background exactly as they are in the first image.",
    "Keep the outfit true to the reference: the same colour, the same embroidery placement and density, the same neckline, sleeves and hems, and the sheer dupatta draped naturally.",
    "Do not beautify, slim, smooth or reshape the body or face. Do not add jewellery, make-up, text, logos or watermarks.",
    "Return one photorealistic image only, at the framing of the first image.",
  ].join("\n");
}
