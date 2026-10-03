# Find Your Fit: design spec

Date: 2 October 2026
Status: Approved in brainstorming; revised 2 October 2026 (on-device measuring, inches first, line-drawn style cards, focused app shell); awaiting written-spec review
Branch: `feature/find-your-fit`
Supersedes: the standalone `measure-app` described in the supplied APP.md (vanilla HTML/JS, Cloudflare tunnel, localStorage only)

## 1. Intent

### What the client asked for

- A mobile web feature where customers get **draft** Punjabi suit measurements from photos plus height, pick a suit style and fit preference, try catalogue looks on their own photo, and send everything to Gulmohar on WhatsApp.
- A staff area (Studio) to see clients, order briefs, measure in the shop and record tailor corrections.
- A **gate** before the fit flow: name and phone number (any country) so Gulmohar has a record of every customer.
- Store the customer's **suit preference**, but **never their sizes or photos**.
- Originally, an AI service for measurements and **Gemini** for try-on. On 2 October 2026 the client chose to measure **on the device** with the prototype's ported engine instead of Bodygram, so photos never leave the phone for measuring. Gemini stays for try-on.

### Success criteria

1. A customer on a phone can go from `/fit` to a WhatsApp message containing their draft measures and preferences in under five minutes.
2. Every customer who starts the flow has a Supabase record (name, E.164 phone, consent, preferences).
3. No photo, measurement, height or weight is ever written to Gulmohar's database, logs or analytics.
4. Every number is labelled **DRAFT, tailor to verify**. Every try-on image is labelled **AI preview, not a photograph of the garment**.
5. Staff can sign in to Studio, see clients and order briefs, and open a WhatsApp chat with any client in one tap.
6. The feature looks and reads like part of the existing Gulmohar Wears site.

### Assumptions (stated, not confirmed by the client)

- The original `measure-app` source was downloaded from the Grok prototype's tunnel on 2 October 2026 and is kept at `reference/measure-app` (excluded from deployments by `.vercelignore`). Its style-length rules, calibration, fit ease and size chart are ported faithfully. Its four style images look AI-generated and are not used.
- Studio staff are a small known group (a handful of email addresses).
- Customers are mostly in India, with some international (worldwide shipping per the site brief).

## 2. Scope

### Release 1 (this spec)

- Customer: intro, gate, style and height, photos, draft fit, try-on, profile.
- Studio: login, Clients, Orders, Fit (in-shop), Tailor corrections, Import DRAFT code.
- Measurements: on-device engine ported from the prototype (MediaPipe pose plus the prototype's formulas). No measurement vendor.
- Vendor: Gemini image editing (try-on) only.
- Supabase: client records, staff allowlist, daily usage counters.

### Deferred

- Tailor **bias learning** (corrections are recorded now so it can be added later).
- Studio **Inventory** upload (try-on uses the existing catalogue photos in `src/lib/catalogue.ts`).
- GoHighLevel sync (stays behind the enquiry boundary in `docs/INTEGRATIONS.md`).
- Payments.
- A measurement vendor (Bodygram or similar). Dropped by the client on 2 October 2026 in favour of free, private on-device measuring. The `MeasureProvider` interface stays so one can be added later if accuracy demands it.

### Out of scope

- Storing photos or measurements anywhere server-side, for any reason.
- Showing AI try-on images in the public catalogue or marketing.

## 3. Constraints from the existing project

- Lives inside `~/gulmohar-wears` (Next.js 16.3, React 19, TypeScript). Read `node_modules/next/dist/docs/` before framework code; this Next version has breaking changes.
- Visual system: `src/app/tokens.css` and `STYLEGUIDE.md` as-is. Bodoni Moda display, Manrope text, paper `#F4F0E7`, ink `#362426`, oxblood `#421F25`, flame `#A53726` (accent and focus). Crisp rectangles, no component library. The APP.md tokens (wine, gold, Cormorant, DM Sans, pills) are **not** used.
- Contact values come from `src/lib/brand.ts`. WhatsApp links are built with `whatsappUrl()` in `src/lib/enquiries/messages.ts`.
- Customer copy: no em dashes or en dashes, no invented prices, inventory, lead times or testimonials. Humanizer guidance applies.
- AGENTS.md: no customer data to a backend until a consent flow exists. This spec adds that consent flow; the gate cannot submit without it.
- Review at 390px, 430px and 1440px. Respect reduced motion and keyboard input. Inputs 16px.

## 4. Architecture

### 4.1 Routes

**Customer** (inside the site header and footer; a "Find your fit" link is added to `navigation.tsx`):

| Route | Purpose |
|---|---|
| `/fit` | Intro: "Find your Gulmohar fit", three-step sequence (01 Measure, 02 Try on, 03 Tailor verifies), "How accurate is this?" disclosure, START MY FIT |
| `/fit/start` | Gate: name, international phone, consent. Skipped (pre-filled confirmation) when this phone already holds a valid client token |
| `/fit/measure` | Stepper, step in `?step=` so browser back works: `style` (style + height + optional weight/age), `photos` (front then side), `result` (draft fit) |
| `/fit/try-on` | Choose a catalogue look, view AI preview, "I like this", size or MTM, order on WhatsApp |
| `/fit/profile` | Saved measures on this phone: reuse, re-measure, delete all, update preferences |

`/fit/measure`, `/fit/try-on` and `/fit/profile` redirect to `/fit/start` when there is no client token.

**App shell.** `/fit` and `/fit/profile` sit inside the site header and footer. `/fit/start`, `/fit/measure` and `/fit/try-on` use a focused layout: the brand mark, a slim step bar and a back link, with no site menu and no floating contact orbs, so the camera step has the whole viewport. WhatsApp stays one tap away through each step's own actions.

**Studio** (`/studio/*`, `noindex`, Supabase Auth email login, allowlisted staff only):

| Route | Purpose |
|---|---|
| `/studio/login` | Email and password via Supabase Auth |
| `/studio` (Clients) | List from Supabase: name, phone, style, fit, brief, last seen. Tap opens WhatsApp chat via `wa.me/<e164 digits>`. Delete client |
| `/studio/orders` | Clients with a non-empty brief, sorted by deadline |
| `/studio/fit` | Same measuring flow for in-shop use; results saved on **this device only** against a client |
| `/studio/tailor` | For a client on this device: AI value vs tape-corrected value per field, mark verified. Device-only |
| `/studio/import` | Paste a customer's DRAFT code; decoded measures attach to the matching client **on this device only** |

The Supabase client list and the device-only measurements are joined in the UI by `phone_e164`.

### 4.2 Data placement

| Data | Where it lives | Never in |
|---|---|---|
| Name, phone (E.164), consent time and version | Supabase `fit_clients` | |
| Style, fit, sleeve, neckline, length note, order brief | Supabase `fit_clients` | |
| Daily try-on counts | Supabase `fit_usage` (counts only) | |
| Photos | Phone memory during the session. For measuring they never leave the phone. For try-on only, the person photo is streamed through our server to Gemini, then discarded | Supabase, logs, disk, analytics, localStorage |
| Measurements, height, weight, age | Customer phone localStorage; Studio device localStorage; the WhatsApp message the customer chooses to send | Supabase, logs, analytics |
| Try-on images | Phone memory for display only | Supabase, logs, disk, catalogue |

### 4.3 Supabase schema

```sql
create table fit_clients (
  id               uuid primary key default gen_random_uuid(),
  phone_e164       text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  name             text not null check (char_length(name) between 1 and 80),
  consent_at       timestamptz not null,
  consent_version  text not null,
  style            text check (style in ('punjabi','anarkali','sharara','farshi')),
  fit              text check (fit in ('fitted','regular','relaxed')),
  sleeve           text check (char_length(sleeve) <= 60),
  neckline         text check (char_length(neckline) <= 60),
  length_note      text check (char_length(length_note) <= 200),
  brief            jsonb check (brief is null or (brief - array['occasion','fabric','city','deadline']) = '{}'::jsonb),
  source           text not null default 'fit-app',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table fit_usage (
  phone_e164  text not null,
  day         date not null,
  tryons      int  not null default 0,
  reports     int  not null default 0,   -- "report this preview" count, no content
  primary key (phone_e164, day)
);

create table studio_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text not null
);
```

There are no measurement, height, weight or image columns. The `brief` check rejects unexpected keys.

**Row-level security:** enabled on all three tables. The anon role has no policies (no read, no write). Authenticated users may `select` and `delete` on `fit_clients` and `select` on `fit_usage` only if `auth.uid()` is in `studio_staff`. All customer-side writes go through server code using the service-role key, which never reaches the browser.

### 4.4 Customer identity token

- On successful gate submit, the server returns `token = base64url(client_id) + "." + HMAC_SHA256(FIT_TOKEN_SECRET, client_id)`.
- Stored on the phone as `gulmohar_fit_token_v1`.
- Every customer server call (`updatePreference`, `/api/fit/try-on`) verifies the signature and derives `client_id` and its `phone_e164` from the database. The token can only update that row's preference fields and spend that phone's daily allowance.
- Re-submitting the gate with the same phone updates the name and consent and returns a token for the existing row (upsert on `phone_e164`).

### 4.5 Server boundary

All in `src/app/api/fit/*` route handlers or server actions under `src/lib/fit/server/` (server-only imports):

| Entry | Input | Does | Output |
|---|---|---|---|
| `registerFitClient` | name, phone, consent version, honeypot | Validate with `libphonenumber-js` (default region IN), rate-limit by IP, upsert | token, normalised phone |
| `updatePreference` | token, partial preference | Verify token, whitelist fields, update `updated_at` | ok |
| `POST /api/fit/try-on` | token, person image, look slug | Verify token, check daily cap, load catalogue image by slug server-side, call `TryOnProvider`, increment `tryons` on success | image as data URL |
| `POST /api/fit/try-on/report` | token | Increment `reports` | ok |

Rules for the try-on route:

- Request size limit (8 MB total), JPEG/PNG/WebP only, images downscaled on the phone to a max of 1600px long edge before upload.
- Images are held in memory only. No writes to disk, no logging of bodies, no error reporter payloads containing images or measurements.
- Daily cap per phone (env configurable): `FIT_TRYON_DAILY_CAP=6`. A vendor failure does not consume allowance.
- Studio calls the same try-on route with a Supabase staff session instead of a customer token. The server checks `studio_staff` membership; staff usage uses a separate cap `FIT_STUDIO_DAILY_CAP=30` per staff user. Studio measuring runs on the studio device, exactly like the customer flow.
- Vendor timeout: try-on 45s.

### 4.6 Vendors

**Measurements: on-device engine (no vendor)**

- Runs entirely in the browser. `pose.ts` loads MediaPipe Pose Landmarker (lite model, `@mediapipe/tasks-vision`) with the model file and WASM self-hosted under `public/models/`, never from a CDN at runtime.
- `estimate.ts` ports the prototype's `landmarkMeasures`, `ratioMeasures`, `cmPerPxFromHeight` and `girthCircumference` exactly: scale from the nose-to-heel span (0.93 of height) with torso and shoulder fallbacks, front widths from points interpolated along the shoulder-to-hip lines, torso depth from the side photo, girth as the RMS ellipse `2π·sqrt((a²+b²)/2)`, height-ratio floors and the ±15% clamp against height ratios.
- `confidence.ts` ports `computeConfidence`. Confidence is recomputed after tape calibration (the prototype did not, which is listed as a known gap).
- Honest accuracy statement for the UI: before tape calibration, girths can be off by one to two and a half inches; after one tape value, typically within half an inch to an inch. Several fields (neck, armhole, knee, ankle, and kameez for non-Punjabi styles) are height ratios in practice and are labelled as such with lower confidence.
- Bodygram was considered and dropped by the client on 2 October 2026. `MeasureProvider` remains as the seam; `OnDeviceProvider` is the only implementation in Release 1.

**Try-on: Gemini image editing (Google AI, paid tier only)**

- `GeminiTryOnProvider implements TryOnProvider`. Sends the customer photo, the catalogue look's full-silhouette image, and the versioned prompt from `tryon-prompt.ts`.
- Model chosen after the spike, set by env `GEMINI_IMAGE_MODEL`. Candidates: Gemini 3.1 Flash Image ("Nano Banana 2", about $0.045 to $0.07 per image) and Gemini 3 Pro Image ("Nano Banana Pro", about $0.134 per image). Confirm current model IDs in the official docs at implementation time.
- Env: `GEMINI_API_KEY`. **The key must belong to a billing-enabled (paid) project.** Under Google's unpaid terms, submitted content is used to improve Google products and may be read by human reviewers; under paid terms it is not. The server refuses to start the try-on route if `GEMINI_PAID_TIER_CONFIRMED` is not `true`, as a deliberate deployment check.
- Prompt requirements: keep the person's face, skin tone, body shape, proportions, pose and background unchanged; replace only the clothing with the kameez, dupatta and trousers from the reference; keep the embroidery placement, colour and the sheer dupatta; do not beautify, slim or alter the body; output one photorealistic image.
- Catalogue looks used for try-on come from `src/lib/catalogue.ts` (the three real outfits) using each look's "The full silhouette" image.

**Interfaces**

```ts
interface MeasureProvider {
  scan(input: { front: Blob; side: Blob; heightCm: number; weightKg?: number; age?: number; gender?: 'female' | 'male' }): Promise<RawMeasures>;
}
interface TryOnProvider {
  tryOn(input: { person: Blob; garment: Blob; lookSlug: string }): Promise<{ image: Blob; model: string; promptVersion: string }>;
}
```

### 4.7 Measurement engine (`src/lib/fit/`)

Pure TypeScript, no DOM, no React, unit tested.

| Module | Responsibility |
|---|---|
| `pose.ts` | Only file importing `@mediapipe/tasks-vision`. Lazy-loaded on the client; model self-hosted in `public/models/`. Image to landmarks |
| `retake.ts` | Ported from source. Landmarks to `{ ok, issues[] }`; hard issues (body cut off, wrong orientation, arms against torso) block the estimate, soft issues warn. "Use anyway" after two failed attempts |
| `styles.ts` | Ported. Style defaults: kameez length as % of height (Punjabi ~45%, Anarkali ~58%, Sharara ~48%, Farshi ~52%) and bottom-length rules |
| `measures.ts` | `Measures` type: the prototype's 13 fields in cm, per-field `source: 'landmark' \| 'landmark+side' \| 'ratio' \| 'ratio-clamped' \| 'calibrated' \| 'tailor-verified'`, `mode`, `scaleMethod`, `warnings` |
| `estimate.ts` | Ported scale, front widths, side depth, girth model, ratio fallback and clamp (see 4.6) |
| `confidence.ts` | Ported per-field confidence; re-run after calibration |
| `calibrate.ts` | Ported. One tape bust or waist scales all girths; marks `source: 'tape'` on the measured field |
| `fit-preference.ts` | Ported. Ease Fitted -1 cm, Regular 0, Relaxed +2.5 cm; sleeve, neckline, length note |
| `size-advice.ts` | Ported. Bust, waist, hip vs S to XL chart; MTM if any overflow is 2 cm or more. Notes heaviest ready stock M/L (38 to 40 in) |
| `handoff.ts` | DRAFT code: `GW1.` + base64url(JSON `{v, style, fit, measures}`) + `.` + 4-char checksum. Decode validates version, schema and checksum |
| `device-store.ts` | localStorage wrapper, every access in try/catch. Keys: `gulmohar_fit_token_v1`, `gulmohar_fit_profile_v1` (customer), `gulmohar_studio_measures_v1` (Studio device) |
| `phone.ts` | `libphonenumber-js` wrapper: parse, validate, format E.164, country list |
| `tryon-prompt.ts` | Versioned try-on prompt text |

Porting rule: constants and formulas match the supplied source exactly, each with a comment naming the original function. Gaps or apparent bugs in the source are listed in the implementation plan for the client to decide, never silently changed.

Display: cm is the source of truth internally. Customers see inches first (as in the original app and as Punjab tailors work) with cm alongside, rounded to 0.25 in and 0.5 cm for display only. Each row shows its confidence and the DRAFT label. Profile measures older than six months show "These may be out of date. Re-measure?".

`src/lib/enquiries/messages.ts` gains `composeMeasurementDraft()` and `composeOrderBrief()`, reusing `whatsappUrl()`. The draft message lists readable measures and ends with the DRAFT code.

### 4.8 Components (`src/components/fit/`)

`PhoneField` (country picker, default IN), `ConsentGate`, `StylePicker` (four cards with simple line-drawn silhouettes in `public/fit/styles/*.svg`; the prototype's generated images are not used), `HeightField` (cm or ft/in), `CameraCapture` (getUserMedia with outline guide; upload fallback; downscale before upload), `PoseCheck`, `DraftTable`, `CalibrateForm`, `FitPreferenceForm`, `SizeAdvice`, `OrderBriefForm`, `SendOnWhatsApp`, `LookPicker`, `TryOnPreview` (persistent AI-preview label, report button), `StudioNav`, `ClientList`, `ImportCode`, `TailorCompare`.

All styled with `tokens.css`. Bodoni headings, Manrope controls, oxblood primary action, flame focus ring, 48px targets.

## 5. Customer copy (draft, to be humanized)

- Intro headline: "Find your Gulmohar fit"
- Accuracy disclosure: "Your photos give us a starting point, not a final cut. Measurements from photos can be off by an inch or two, sometimes more. One tape measurement of your bust or waist brings them much closer. Our tailor checks every number before cutting fabric."
- Consent (version `fit-consent-2026-10-02`): "I agree to Gulmohar Wears keeping my name, phone number and style choices so they can help with my order. My measurement photos stay on my phone. If I choose Try on, that one photo is sent to Google's Gemini service to make the preview and is deleted afterwards. Gulmohar never stores my photos or my sizes." Links to the privacy section.
- Draft label: "DRAFT, tailor to verify"
- Try-on label: "AI preview, not a photograph of the garment"

The privacy utility page (`src/app/[info]`) gains a "Find your fit" section: what is stored, what is not, which partners process photos, and how to ask for deletion (WhatsApp or phone from `brand.ts`).

## 6. Error handling

| Situation | Behaviour |
|---|---|
| Camera denied or missing | Show upload from gallery |
| Pose check fails | Specific instruction and retake; "Use anyway" after two attempts |
| No pose found in a photo, or the pose model fails to load | "We couldn't read your pose from this photo." Retake or upload another; after two attempts, "Use height only" gives the ratio draft at lower confidence |
| Daily try-on cap reached | "You've used today's previews. Message us on WhatsApp and we'll help." with WhatsApp link |
| Try-on error | Retry; allowance not consumed |
| Try-on looks wrong | "Report this preview" increments a count only |
| Gemini paid-tier flag missing | Try-on route returns 503; UI hides "Try it on" |
| Supabase unavailable at gate | Retry message; WhatsApp contact shown |
| Preference sync fails | Kept locally and retried on next visit; never blocks WhatsApp |
| Invalid phone | Inline message naming the selected country |
| Invalid or tampered token | Clear token, return to gate |
| Invalid DRAFT code in Studio | "This code looks incomplete. Ask the customer to resend it." |

## 7. Testing

- **Unit** (`node --experimental-strip-types --test`, extending the `test` script to all `*.test.ts`): `phone`, `calibrate`, `fit-preference`, `size-advice`, `styles`, `retake` (fixture landmarks), `handoff` round trip and checksum typo detection, `estimate` and `confidence` against fixture landmarks with expected values computed from the prototype, token sign and verify, preference field whitelist, message composition. Ported modules use cases derived from the original source.
- **Gemini provider:** mocked with recorded responses; tests never call paid APIs.
- **Database:** RLS test proving the anon key cannot read or write any table and a non-staff authenticated user cannot read `fit_clients`.
- **Playwright** (existing setup): full customer journey with fixture images and mocked vendor routes at 390, 430 and 1440px; gate keyboard-only; axe checks on every fit and studio route; reduced motion; Studio login and client list.
- **Privacy check:** a test asserting that request logging and error handling for the image routes contain no image or measurement fields.

## 8. Build order and the spike gate

1. Engine port with unit tests, from `reference/measure-app/app.js`. Known gaps in the prototype are listed in the plan for the client to decide; nothing is changed silently.
2. Customer measure flow, focused app shell, WhatsApp handoff and profile. This works end to end with no keys, so it can be reviewed on a phone first.
3. Supabase schema, RLS, token, gate and preference sync.
4. Studio.
5. **Try-on spike (go or no-go), before any try-on UI.** Needs the client's Gemini (paid) key and one consenting test person. Gemini Flash Image vs Pro Image on the three catalogue looks with the test person's photo. Score each output on dupatta preserved, embroidery recognisable, colour accurate, silhouette correct, person unchanged. Output: `docs/FIT-SPIKE-REPORT.md` with images kept out of the public bundle and a recommendation. If try-on fails the bar, Release 1 ships without `/fit/try-on` and the client decides next steps.
6. Try-on (only if the spike passes).
7. Privacy copy, accessibility, responsive review, deploy to a Vercel preview.

## 9. Dependencies from the client

- (Received 2 October 2026) Original `measure-app` source, kept in `reference/measure-app`.
- Google AI Studio project **with billing enabled**, and a Gemini API key.
- Supabase project (or approval for me to create one through the Vercel Marketplace).
- Studio staff email addresses.
- A consenting test person for the spike.
- Confirmation of the consent wording.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Gemini alters embroidery or the customer's body | Spike gate, strict prompt, report button, persistent AI label |
| On-device engine is approximate: several fields are height ratios in practice, and widths come from joint centres rather than the body outline | Honest DRAFT and confidence labels, the tape calibration step given prominence, tailor verification, and the `MeasureProvider` seam for a vendor later |
| Try-on cost spikes | Gate, signed token, per-phone daily cap |
| Photos accidentally stored or logged | No storage code paths, privacy test, no image fields in logs |
| Unpaid Gemini key used in production | `GEMINI_PAID_TIER_CONFIRMED` deployment check |
| Model retirement or price change | Providers behind interfaces; model ID in env |
