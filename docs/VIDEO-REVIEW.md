# Homepage film review, 21 September 2026

Implemented real Drive footage in the hero, fuchsia collection spread and seated olive-gold detail. The existing on-request product film is preserved. The original portrait frames remain intact; no colour grades or synthetic clothing edits were applied. Source IDs, timings, processing and bytes are recorded in public/media/video-manifest.json.

Chrome browser review at 390px, 430px and 1440px. Screenshots: screenshots/video-home-{width}.png and screenshots/video-hero-{width}.png. The screenshots show reduced-motion poster states for consistent visual review; automated tests verify moving playback separately. No physical iOS or Safari testing has been performed.

Validation: production build, TypeScript, ESLint, two enquiry unit tests and ten Playwright tests passed. Browser coverage includes silent inline playback, deferred below-fold downloads, offscreen pausing, persistent manual pause, reduced-motion and Save-Data without MP4 requests, explicit phone playback using the 480px file, failed-media poster fallback, simulated autoplay refusal with manual recovery, live reduced-motion changes, route overflow, menu keyboard behaviour, existing product-film behaviour, WhatsApp enquiry handoff and automated accessibility scans.

The smallest hero file is 1,143,428 bytes; the desktop version is 2,373,782 bytes. Page load completes before automatic media loading begins. Browser Save-Data/network hints are used only when exposed. Low-power browsers may refuse autoplay; the play control remains available. These checks do not establish a Lighthouse score or real mobile network performance for the new version.
