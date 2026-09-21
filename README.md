# Gulmohar Wears

Next.js 16 / React 19 / TypeScript. An asset-led bespoke Indian wear site with contextual WhatsApp and Instagram enquiry paths. Online payment and GoHighLevel integration are later phases.

```sh
npm install
npm run dev
```

Open http://localhost:3001/. Collections, three real product galleries, Custom, Atelier, Journal and utility pages are implemented. `/design-studies` retains the rendered font comparison; `/styleguide` describes the current visual system. The preview is noindex.

```sh
npm run lint
npm run typecheck
npm test
npm run test:ui
npm run build
```

Playwright tests use installed Google Chrome. `scripts/capture-review.mjs` produces the responsive screenshot set. Read STYLEGUIDE.md, REFERENCES.md, MEDIA-PLAN.md, docs/REDESIGN-AUDIT.md, docs/REDESIGN-REVIEW.md and docs/INTEGRATIONS.md.

Raw originals and development files stay in ignored raw-assets/. The media manifest traces public derivatives to the supplied Drive files. Processing scripts require rawpy/Pillow in `.venv`, FFmpeg and Sharp (provided by Next). Browser previews support selection; final photographs were decoded from Sony RAW originals.

No external messages are sent by the site automatically. Preparing an enquiry keeps it in browser memory. Opening WhatsApp passes the prepared text to WhatsApp; the customer chooses whether to send. GHL and payment adapters are not connected. Product prices, fabric composition, making times and order-specific terms must be confirmed by the business.
