# Gulmohar Wears

Read STYLEGUIDE.md before UI work. All design decisions and CSS values live in
src/app/tokens.css. This is a separate brand and repository from CalmVida.
Read the relevant installed Next.js guide in node_modules/next/dist/docs before
changing framework code.

## Confirmed scope, 21 September 2026

- WhatsApp and Instagram ordering first. Online payments later.
- Future GoHighLevel integration belongs behind the enquiry boundary, never in UI components.
- Never send customer data to a CRM until an integration and consent flow are configured.
- Contact values originate in the client brief; keep them centralized in src/lib/brand.ts.
- No invented inventory, prices, lead times, testimonials, shipping history or founder stories.
- Supplied brand artwork stays intact. Use original shoot assets only for garments.
- No em dashes or en dashes in customer copy. No component library.
- The corrective brief overrides previous styleguide and media approval gates. Implement and visually review the complete asset-led redesign without routine approvals.
- Review on 390px, 430px and 1440px widths. Respect reduced motion and keyboard input.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
