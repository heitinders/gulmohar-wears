# Gulmohar Wears: Claude instructions

Project rules live in AGENTS.md. This file mirrors the site Design Context from
.impeccable.md so it is always loaded; if they differ, update both. Find Your Fit
has its own section in .impeccable.md.

## Design Context

### Users

People choosing bespoke Punjabi and Indian occasionwear, including international
customers discussing a remote fitting and worldwide delivery. Most arrive on a
phone. The job: see real garments clearly, find an outfit or express a custom
idea, and start a useful WhatsApp or Instagram conversation with the Mohali
atelier. There is no cart or checkout yet; the enquiry is the conversion.
Preserve enquiry functionality; any future GoHighLevel work stays behind the
enquiry boundary, never in UI components.

### Brand Personality

Assured, warm, precise. A fashion editorial with the intimacy of a fitting.
Customers should feel they are in capable hands and are told the truth. Copy
describes the clothing and the next step plainly: no hype, no stacked slogans,
no em or en dashes, no invented history, inventory, prices or lead times.

### Aesthetic Direction

Gulmohar, an atelier in bloom. Large color-faithful garment images, full looks
paired with meaningful details, fine editorial numbering, restrained flower red
on paper and oxblood. Bodoni Moda for display, Manrope for reading. Crisp
rectangles, rules and underlined links; varied open compositions rather than a
card grid.

- References: Divani Couture for garment-led scale and chapter pacing (structure
  only; no copy, marks or craft history borrowed).
- Apple: usability plus restraint. Borrow clear navigation, predictable
  interaction, visible focus, generous whitespace, one soft shadow or none, and
  tight display leading. Do not borrow SF Pro, black/#f5f5f7 sections, Apple
  Blue, pill CTAs or glass. Gulmohar tokens win every visual conflict.
- Anti-references: decorative palace imagery, glass as an organizing device,
  Cormorant and gold, gradients, sparkle, anonymous stock, generated garments.
  Supplied brand artwork stays intact.
- Theme: light only, by design. Paper surfaces with oxblood chapters supply the
  darkness. Do not add a prefers-color-scheme dark theme; it would retint the
  frame around garment photography.

### Accessibility

WCAG 2.2 AAA where practical, AA everywhere. Measured 7 October 2026:

- AAA (7:1+): ink on paper 12.9, on-dark on oxblood 13.1, on-dark-muted on
  oxblood 8.7. Use these for body text and anything read at length.
- AA only: muted on paper 5.6 (4.9 on paper-deep), flame on paper 5.8, on-dark
  on flame 6.0. Keep these to labels, metadata, large text and accents. If a
  muted passage must be body text, use ink or add a darker token first.
- 48px targets, keyboard parity with hover, visible flame focus ring, native
  dialogs with focus containment, 16px inputs.
- Reduced motion sets --duration to 0s; films fall back to stills under reduced
  motion, data saving and slow connections. No parallax or entrance animations.

### Design Principles

1. The garment leads. Images are the event; type and chrome step back, and
   nothing tints or crops away the clothing's true colour.
2. Truth is part of the design. Only photographed features are described;
   anything unconfirmed goes to the conversation, not the page.
3. Every path ends in a person. WhatsApp or Instagram is always one clear step
   away, and the customer chooses when a message is sent.
4. Restraint over decoration. One accent, rules instead of boxes, whitespace
   instead of ornament; if an element does not help someone choose or ask, cut it.
5. Tokens first. New colours, fonts, sizes or motion are added to tokens.css
   before any component uses them.

