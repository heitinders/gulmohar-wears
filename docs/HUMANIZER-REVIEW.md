# Navigation and customer-copy review

Skill applied: [Humanizer](../../.agents/skills/humanizer/SKILL.md), version 2.8.0. Its draft, audit and final-rewrite process was applied to the customer-facing pages. Factual product descriptions, contact details, enquiry behavior and unconfirmed order conditions were preserved.

## Draft rewrite

The first pass is recorded in [humanizer-edits.json](humanizer-edits.json). Each entry contains the file, original phrase and draft replacement. Examples:

| Original | Draft |
|---|---|
| Three looks. Three expressions. A starting point for your own. | See each suit in full, then take a closer look at the embroidery. |
| A thought. A conversation. Your creation. | What would you love to wear? |
| Your vision | What do you have in mind? |
| It begins with you. | Have something in mind? |
| Another expression. | You might also like. |

## What still sounded generated?

- The draft asked a similar “in mind?” question in the introduction and closing invitation. The closing now says “Let’s talk about your outfit.”
- The journal still read like generic instructions, with repetitive imperatives and phrases such as “Choose references with a purpose.” Both articles were rewritten around practical customer questions, with examples of changing a sleeve or border.
- Some help pages used distant third-person references to “the atelier” where the business could speak directly. They now use we/you where appropriate, while retaining clear conditions and privacy explanations.
- Short display copy is not automatically a problem. “Made for your occasion” and the supplied “Tradition in every thread” tagline were retained. Unsupported fabric, handwork, price and turnaround claims were not introduced.

## Final rewrite

The implemented copy is captured from the rendered pages in [HUMANIZER-FINAL-COPY.md](HUMANIZER-FINAL-COPY.md). This includes the homepage, custom orders, collection pages, product descriptions, atelier, both journal articles and all help pages. Live components contain the final wording. Customer copy has no em or en dashes.

## Header

The previous layout occupied approximately 191px on desktop and 145px on phones, including its announcement strip. The new header occupies 81px and 73px respectively, including the border. Original flowers and lettering are arranged horizontally using CSS windows. The original image is unchanged and the full mark stays in the footer.

Serif navigation links, an oxblood contact action and a photograph-led Collections panel share the page design. The panel supports button activation, Escape dismissal with focus restoration, dismissal outside the header and direct category/product navigation. Mobile uses a native dialog with a photographed detail, contact links and focus handling. The floating WhatsApp shortcut remains available outside the menu.

Screenshots are in screenshots/navigation-copy, including before/after openings at phone and desktop sizes, the open collection menu and the mobile menu.

## Verification

Lint and production build passed. The existing four browser scenarios passed for responsive routes, mobile navigation, product enquiry and automated accessibility. The new collection-menu scenario passed for keyboard activation, Escape/focus restoration, outside dismissal, garment navigation and accessibility scans of both open menus. Visual review covered 390px, 430px, 768px, 1024px and 1440px header layouts, plus full customer pages at phone and desktop sizes.
