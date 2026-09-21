> Historical foundation review. Superseded by REDESIGN-REVIEW.md and the implemented asset-led site.

# Foundation checkpoint, 21 September 2026

## Built

- Independent repository at `/Users/heitindersingh/gulmohar-wears`, opened using
  the installed VS Code launcher.
- Live `/styleguide`, original supplied artwork, self-hosted fonts, token system,
  frosted navigation, native mobile dialog, process and interaction specimens.
- Working enquiry composer with a review step, context-preserving WhatsApp link,
  Instagram DM route and telephone links.
- CRM-neutral versioned enquiry model and future GoHighLevel integration notes.
- No payments, email delivery or CRM transmission. No inventory invented.

## Decisions

Cormorant Garamond and Inter pair an editorial expression with readable controls.
Ivory and warm charcoal support the original identity. Flame red is the action
color. Gold and muted text were darkened after measured contrast failures on the
secondary ivory surface. The original art is displayed intact. Hero photography
and garment content wait for the media selection, as requested by the brief.

The default route redirects to the review page. This build is noindex. It is a
foundation review, not the production homepage.

## Validation

- Production build, TypeScript, ESLint: passed on Next.js 16.3.5.
- Two message serialization tests: passed.
- Two Playwright tests: passed using local headless Google Chrome.
- No horizontal overflow at 390, 430, 768, 1024, 1440 or 1920px.
- Mobile dialog opens, Escape closes it, trigger focus restores.
- WhatsApp payload retains occasion, destination, fabric and special characters.
- Editing form input clears stale preview. Reduced motion disables smooth scroll.
- Axe WCAG A/AA tags: zero detected violations at 390 and 1440px.
- Npm audit after the patched dependency update: zero reported vulnerabilities.
- No messages sent to the business during testing.

Automated checks are not a complete accessibility certification. Real iPhone
Safari, other browsers, Lighthouse and throttled performance testing remain for
the later page and polish checkpoints. There are no claimed Lighthouse scores.

## Screenshots

- `screenshots/foundation-390.png`
- `screenshots/foundation-430.png`
- `screenshots/foundation-1440.png`

## Review and next inputs

TODO: Is this palette, typography and restrained glass treatment approved?

After foundation review: inspect every supplied shoot asset and produce
MEDIA-PLAN.md before the homepage. Google Drive's public browser view shows the
two shoot folders. Nine ARW files with overlapping names also exist in Downloads;
their identity and suitability have not yet been verified.

Before customer-facing collections: obtain garment names, fabric/work, price
policy and availability. Before the Atelier and utility pages: obtain founder
story, address, hours, timelines and business-approved policy details. No payment
provider decision is needed for this launch. No GHL credentials are needed until
that integration is commissioned.
