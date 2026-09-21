# Implemented redesign review

21 September 2026. Project: `/Users/heitindersingh/gulmohar-wears`.

## Open the result

- Working site: http://localhost:3001/
- Production audit preview: http://localhost:3002/
- [Side-by-side review](review.html)
- [Visual asset map](asset-map.html)
- [Detailed media plan](../MEDIA-PLAN.md)
- [Rendered type studies](http://localhost:3001/design-studies)
- [Current style guide](../STYLEGUIDE.md)

The homepage is now a customer-facing garment campaign instead of a foundation demonstration. All customer page families are implemented: Collections and category pages, three Product pages, Custom, Atelier, Journal and articles, Contact, Size and fit, Shipping, Returns, FAQ, Privacy and Ordering information. Only photographed features are treated as known product facts.

## Visible changes and review corrections

The real olive-gold silhouette and a matching detail occupy the opening. Fuchsia and blue form a staggered editorial spread. The collection index changes preview on hover and keyboard focus; mobile uses visible garment entries. The closer-look chapter pairs two views of the same olive-gold outfit. A personal process and a direct invitation close the page. The full Gurmukhi artwork remains intact in the footer; the typeset Latin navigation mark is provisional.

Bodoni Moda and Manrope were selected after rendering two real-asset studies. The alternative Newsreader study and desktop/mobile captures remain available. Font licenses are included locally. Oxblood, warm paper, ink and a restrained flower accent replace the glass-card treatment. Garment exports do not receive a matching warm filter.

Visual review corrected: a desktop hero column gap, a cramped mobile detail caption, joined words when a mobile line break disappeared, an unintended wide-screen headline wrap, and the 430px opening CTA position. The resulting screenshots cover 390, 430, 768, 1024, 1440 and 1920px. Full homepage, Collections, Product, Custom, Atelier and Journal captures exist at phone and desktop sizes. Section captures hide sticky navigation only during capture so it does not obscure the section being documented.

## Comparable evidence

| View | Before | After |
|---|---|---|
| Desktop opening, 1440px | [Before](../screenshots/before/before-opening.png) | [After](../screenshots/after/home-1440-opening.png) |
| Phone opening, 390px | [Before](../screenshots/before/mobile-390.png) | [After](../screenshots/after/home-390-opening.png) |
| Full desktop | [Before](../screenshots/before/before-desktop.png) | [After](../screenshots/after/home-1440-full.png) |
| Full phone | [Before](../screenshots/before/before-mobile.png) | [After](../screenshots/after/home-390-full.png) |

The opening phone captures are 900px and 844px high respectively; their width is the same. Reference-site screenshots and both typography studies are retained in screenshots/references and screenshots/studies.

## Checks performed

- Production build passed, including generated routes and TypeScript.
- ESLint passed with no warnings; standalone typecheck passed.
- Two unit tests passed for Unicode-safe WhatsApp encoding and user input normalization.
- Four Playwright scenarios passed: customer route status/overflow, mobile menu focus and dismissal, product gallery/contextual enquiry/video behavior, and automated accessibility.
- Seventeen customer routes checked at six viewport widths: no horizontal overflow and one primary heading per page.
- Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA scans across seven layout types at 390 and 1440px reported no violations. This is automated evidence, not comprehensive accessibility certification.
- Keyboard menu open/close, Escape, initial focus and focus restoration verified. Reduced-motion scrolling verified. Product thumbnail selection and caption update verified.
- All 17 internal destinations linked from the homepage returned 200. Unknown page, product and category returned 404.
- Product-specific direct enquiry and Custom handoff retain the chosen outfit. Prepared text preserves ampersands, Unicode and destination. Editing a field invalidates the old prepared message.
- Video is absent from the initial DOM, loads on request, remains paused until played and uses native controls. No external message was sent and no order was placed.
- Font loading, visible image decoding, runtime errors and responsive screenshots recorded in render-review.json and link-font-check.json. No browser console errors were observed during the recorded checks.
- Copy scan found no em or en dashes in src/.

## Measured performance

Local production build, Lighthouse 12.8.2 CLI, installed Google Chrome headless on this Mac. Mobile uses the Lighthouse simulated Moto G Power viewport (412×823, DPR 1.75), simulated 150ms RTT / 1638.4 Kbps network and 4× CPU slowdown. Desktop uses the Lighthouse desktop preset. Cold audit runs; no field traffic or real mobile device data.

| Measure | Mobile | Desktop | Original target |
|---|---|---|---|
| Performance | 93 | 99 | Mobile 95+ |
| Accessibility | 100 | 100 | 100 |
| Best practices | 100 | 100 | 100 |
| SEO | 63 | 63 | 100 at launch |
| FCP | 1.1s | 0.3s | Not specified |
| LCP | 3.3s | 1.0s | Under 2.0s on 4G |
| CLS | 0 | 0 | Under 0.05 |
| Total blocking time | 0ms | 0ms | Not a substitute for INP |
| Audit transfer | 772 KiB | 862 KiB | Not specified |

Reports: lighthouse-mobile-final.json and lighthouse-desktop-final.json. The first mobile measurement was 80 / 5.3s LCP. Prioritizing eager image decoding and supplying additional smaller responsive variants improved the measured result without removing photography. Mobile performance and LCP remain below the requested targets. SEO is intentionally reduced by preview noindex; remove it only when the production domain and launch content are settled. INP has not been measured from real interactions or field usage. No claim of field Core Web Vitals is made.

## Remaining dependencies and limits

- No asset access blocker remains: the Drive folder was accessible and the supplied media was reviewed. The public derivatives trace to full RAW originals.
- Material composition, embroidery technique, prices, availability, precise making times, return terms and other order-specific facts still require business confirmation. The UI routes these to an enquiry instead of inventing them.
- No photographed lehenga or workshop was identified. Custom lehenga enquiry is available; model photography is not presented as workshop evidence.
- Production domain, deployment and launch indexing are not configured. This is a running local review build.
- GoHighLevel and payments remain future integrations. The versioned provider-neutral enquiry model and server-adapter plan are retained in INTEGRATIONS.md. No secrets or CRM transport are placed in UI components.
- Testing used desktop Chrome and emulated viewport sizes. Real iPhone/Safari, Android Chrome, Firefox and real-device network behavior were not tested.
