# Find Your Fit, part 1: on-device measuring. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A customer on a phone opens `/fit`, picks a style, enters height, takes or uploads a front and side photo, and gets a draft measurement sheet (inches first, cm alongside, confidence per row) that they can calibrate with one tape value, adjust for fit preference, save on the phone and send to Gulmohar on WhatsApp. Everything runs on the device. No keys, no backend.

**Architecture:** Pure TypeScript engine in `src/lib/fit/` ported line for line from `reference/measure-app/app.js` (cm internally), unit tested with `node --test`. Client components in `src/components/fit/` and pages under `src/app/fit/`. MediaPipe Pose Landmarker runs in the browser from self-hosted assets. The gate (`/fit/start`), Supabase and Studio are part 2; try-on is part 3.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19, TypeScript, `@mediapipe/tasks-vision@1.0.1`, Node 22 `node:test`, Playwright with axe.

**Spec:** `docs/superpowers/specs/2026-10-02-find-your-fit-design.md` (sections 3, 4.1, 4.6, 4.7, 4.8, 5, 6, 7). Read it first. Also read `.impeccable.md` (Find Your Fit section) and `STYLEGUIDE.md`.

## Global Constraints

- Next.js 16.3.5: read `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` and `05-server-and-client-components.md` before writing pages. `searchParams` is a Promise. `ssr: false` dynamic imports only inside Client Components.
- Visual system: `src/app/tokens.css` and `STYLEGUIDE.md` as-is. Bodoni Moda display, Manrope text, paper `#F4F0E7`, ink `#362426`, oxblood `#421F25`, flame `#A53726`. Crisp rectangles (`border-radius: 0`), no component library, no gradients as decoration, no gold, no sparkle wallpaper.
- Customer copy: no em dashes or en dashes (use commas, full stops or "to"). No invented prices, inventory, lead times or testimonials. Sentence case. Every measurement carries "DRAFT, tailor to verify".
- Units: engine in cm. Customers see inches first, cm alongside. Display rounding: inches to 0.25, cm to 0.5.
- Porting rule: constants and formulas match `reference/measure-app/app.js` exactly, each function carrying a comment `// Ported from app.js <functionName> (L<start>-<end>)`. Known gaps in the prototype are listed under "Decisions for the client" below and are not changed silently.
- Photos and measurements never leave the device and are never logged. No analytics events carry measurement values.
- Inputs 16px minimum. Touch targets 48px (`var(--target)`). Visible focus (`:focus-visible` is global). Reduced motion respected (`--duration` is already `0s` under `prefers-reduced-motion`).
- Pages render `<main id="main">` with exactly one `h1` (the existing Playwright foundation test asserts `main h1` count is 1 per route).
- In `src/lib/**`, import sibling modules with the `.ts` extension (`import { x } from "./units.ts"`) so `node --experimental-strip-types` can run them. Components import via `@/lib/...` without extension, as `enquiry-form.tsx` does.
- Commit style: imperative subject without a type prefix (see `git log`), body optional, end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **Landscape or cropped photos.** A photo where the feet are cut off must not silently produce confident numbers: `estimate.ts` falls back to torso scale and `retake.ts` flags it hard. Test in Task 3 (`nose-hip-fallback`) and Task 4 (feet cropped is hard).
2. **Height typed in the wrong unit or out of range.** 64 cm or 640 in must be refused at the field, 47 to 87 in accepted, with the error next to the field. Test in Task 12 (HeightField).
3. **Tape value typed in cm or absurd.** `calibrate.ts` rejects below 40 cm or above 160 cm and any scale outside 0.7 to 1.4, and the UI says so next to the field. Test in Task 5.
4. **localStorage unavailable** (private mode, full quota). Every read and write is try/caught and the flow continues without saving, showing "Couldn't save on this phone" rather than crashing. Test in Task 8 with a throwing storage.
5. **Pose model fails to load** (offline, blocked WASM). The photos step shows "We couldn't read your pose from this photo" with retake, and after two attempts offers "Use height only". Test in Task 14 (Playwright, model path blocked with `page.route`).

## Design notes (from the frontend-design pass)

The brand palette and type are fixed by `tokens.css`, so the design freedom is spent on layout and one signature element.

**Signature: the tape rail.** The step indicator is a tailor's tape. A full-width strip of fine vertical ticks (every 8px, a taller tick every 40px) drawn with CSS `repeating-linear-gradient` in `var(--line)`. Progress is the same tick pattern in `var(--flame)` sliding in from the left as steps complete (`width` transition, `var(--duration)`). Step labels sit under it: `01 Style`, `02 Photos`, `03 Your fit`. Numbering is justified because the steps are a real sequence. Nothing else on the page is decorated.

**Focused shell** (`/fit/measure`): a 56px bar (`--fit-bar`) with "← Back" on the left and the compact brand lockup on the right, then the tape rail, then the step content. The site header, footer and floating orbs are hidden with `body:has(.fit-focus) ...` in `fit.css`, the same `:has` technique `globals.css` already uses for dialogs.

**Measurement ledger** (results): one row per field. Left, the field name in Manrope 13px with a small source word under it ("from photo", "photo and side", "from height", "your tape"). Right, the inches value in Bodoni 28px with a small "in", then cm in 12px muted. Under each row a 2px confidence bar in flame (85 and up), ink (70 to 84) or `--line` (below 70), with the percentage printed so colour is never the only signal. Rows separated by 1px rules. The DRAFT eyebrow sits above the ledger in flame.

**Style cards:** 2 by 2 grid, each a crisp rectangle on `--paper-light`, a line-drawn silhouette (stroke `currentColor`, 1.25px, ink) at 60% of the card, name in Bodoni 21px, one-line note in 12px muted. Selected card: 2px oxblood border, `aria-pressed="true"`.

**Camera step:** the preview fills the viewport under the bar. An outline guide (SVG, `--on-dark` at 45% opacity) shows where head, shoulders and feet should be. Actions sit in a bottom bar: "Take photo" (primary), "Upload instead" (outline). Plain-language retake tips appear in a strip above the actions.

```
390px, /fit/measure?step=style         390px, /fit/measure?step=result
┌────────────────────────────┐          ┌────────────────────────────┐
│ ← Back          [lockup]   │          │ ← Back          [lockup]   │
│ ▏▏▏▎▏▏▏▏▎▏▏▏▏▎▏▏▏▏▎▏▏▏▏▎▏ │ tape     │ ▏▏▏▎▏▏▏▏▎▏▏▏▏▎▏▏▏▏▎▏▏▏▏▎▏ │
│ 01 Style  02 Photos 03 Fit │          │ 01 Style  02 Photos 03 Fit │
├────────────────────────────┤          ├────────────────────────────┤
│ Choose your silhouette     │ h1       │ DRAFT, TAILOR TO VERIFY    │
│ ┌──────────┐ ┌──────────┐  │          │ Your draft fit             │ h1
│ │  (line)  │ │  (line)  │  │          │ Simran · Classic Punjabi   │
│ │ Classic  │ │ Anarkali │  │          │ ───────────────────────────│
│ └──────────┘ └──────────┘  │          │ Bust            33¼ in     │
│ ┌──────────┐ ┌──────────┐  │          │ from photo      84.5 cm    │
│ │ Sharara  │ │ Farshi   │  │          │ ▬▬▬▬▬▬▬▭▭▭  61%            │
│ └──────────┘ └──────────┘  │          │ ───────────────────────────│
│ Your name (optional)       │          │ ...                        │
│ Height *      [64] in | cm │          │ [Correct with one tape]    │
│ [Next: Photos           →] │          │ [Send on WhatsApp       →] │
└────────────────────────────┘          └────────────────────────────┘
```

## Decisions for the client (prototype gaps found while mapping `app.js`)

Listed so the client can decide; the port keeps the prototype's behaviour unless a line says otherwise.

1. Neck, armhole, knee and ankle are effectively height ratios (their landmark formulas always fall below the height floors). Ported as-is; the UI labels them "from height".
2. Kameez for Anarkali, Sharara and Farshi is `height × ratio`, labelled "landmark" in the prototype. Ported, but the UI shows "from height" for these (display only, numbers unchanged).
3. `FIT_EASE.fitted = -1 cm` lowers the body girth before the chart lookup, so a 34 in bust with "Fitted" becomes "Custom". Ported as-is; pinned by a test so it is visible.
4. Confidence was not recomputed after tape calibration. **Changed:** part 1 recomputes it (spec 4.6 says so).
5. The side photo was effectively required. **Kept required** in part 1: the side step cannot be skipped except through "Use height only".
6. Tailor bias learning is deferred (spec 2). Not ported in part 1.
7. Knee and ankle "widths" measure the distance between the two knees or ankles (stance), not limb width. Ported as-is.

## File structure

```
scripts/fetch-pose-assets.mjs          copies MediaPipe WASM from node_modules and downloads the pose model into public/models (gitignored), run on postinstall
public/models/                         (gitignored) pose_landmarker_lite.task, wasm/*
public/fit/styles/{punjabi,anarkali,sharara,farshi}.svg   line drawings
src/lib/fit/units.ts                   CM_PER_IN, round1, cmToIn, inToCm, formatIn, formatCm
src/lib/fit/measures.ts                Field list, Measures type, Source type, Landmark types, LM indices, RATIOS
src/lib/fit/styles.ts                  the four styles (ratios, labels, bottom rows), getStyle
src/lib/fit/estimate.ts                cmPerPxFromHeight, girthCircumference, ratioMeasures, landmarkMeasures
src/lib/fit/retake.ts                  assessPoseQuality
src/lib/fit/calibrate.ts               applyTapeCalibration, clearTapeCalibration
src/lib/fit/fit-preference.ts          FIT_EASE, labels, FitPreference type
src/lib/fit/size-advice.ts             SIZE_CHART, recommendSize
src/lib/fit/confidence.ts              computeConfidence, confidenceLevel
src/lib/fit/handoff.ts                 encodeDraftCode, decodeDraftCode
src/lib/fit/device-store.ts            profile storage behind a Storage-like interface
src/lib/fit/pose.ts                    (client only) loadPoseLandmarker, detectLandmarks
src/lib/fit/measure-provider.ts        MeasureProvider interface and OnDeviceProvider
src/lib/fit/*.test.ts                  node:test files next to each module
src/lib/enquiries/messages.ts          + composeMeasurementDraft, composeOrderBrief
src/app/tokens.css                     + --fit-bar
src/app/fit/fit.css                    all Fit styles (imported by the fit layout)
src/app/fit/layout.tsx                 imports fit.css, metadata title
src/app/fit/page.tsx                   intro (inside site chrome)
src/app/fit/measure/page.tsx           focused shell + <MeasureFlow/>
src/app/fit/profile/page.tsx           saved measures on this phone
src/components/fit/tape-rail.tsx       the signature step indicator
src/components/fit/focus-bar.tsx       back link + lockup, wraps children in .fit-focus
src/components/fit/style-picker.tsx
src/components/fit/height-field.tsx
src/components/fit/camera-capture.tsx
src/components/fit/pose-tips.tsx
src/components/fit/ledger.tsx          measurement rows
src/components/fit/calibrate-form.tsx
src/components/fit/fit-preference-form.tsx
src/components/fit/size-advice.tsx
src/components/fit/order-brief-form.tsx
src/components/fit/send-on-whatsapp.tsx
src/components/fit/measure-flow.tsx    the stepper, owns state, reads ?step=
src/components/navigation.tsx          + "Find your fit" link
src/components/footer.tsx              + "Find your fit" link
tests/fit.spec.ts                      Playwright
package.json                           deps, postinstall, test glob
.gitignore                             public/models/
```

---

### Task 1: Units and measure types, and the test glob

**Files:**
- Create: `src/lib/fit/units.ts`, `src/lib/fit/measures.ts`, `src/lib/fit/units.test.ts`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces: `CM_PER_IN = 2.54`, `round1(n)`, `cmToIn(cm)`, `inToCm(inch)`, `formatIn(cm): string` (quarter-inch, e.g. `"33¼ in"`), `formatCm(cm): string` (half cm, e.g. `"84.5 cm"`); `FIELDS` (13 keys in order), `Field`, `Source`, `Measures`, `Landmark`, `Landmarks`, `LM`, `RATIOS`, `GIRTH_KEYS`.

- [ ] **Step 1: Change the test script to run every test file**

In `package.json` replace the `test` line with:

```json
"test": "node --experimental-strip-types --test \"src/**/*.test.ts\"",
```

Run `npm test`. Expected: the existing `messages.test.ts` still passes.

- [ ] **Step 2: Write the failing unit tests**

`src/lib/fit/units.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { CM_PER_IN, round1, cmToIn, inToCm, formatIn, formatCm } from "./units.ts";

test("constants and conversions match the prototype", () => {
  assert.equal(CM_PER_IN, 2.54);
  assert.equal(round1(84.449), 84.4);
  assert.equal(round1(84.45), 84.5);
  assert.equal(inToCm(64), 162.56);
  assert.equal(round1(cmToIn(162.56)), 64);
});

test("formatIn rounds to the nearest quarter inch with fraction glyphs", () => {
  assert.equal(formatIn(84.5), "33¼ in");   // 33.27 in
  assert.equal(formatIn(162.56), "64 in");
  assert.equal(formatIn(91.44 + 1.27), "36½ in"); // 36.5 in exactly
  assert.equal(formatIn(93.98), "37 in");   // 37.0 in
  assert.equal(formatIn(96.2), "37¾ in");   // 37.87 in
});

test("formatCm rounds to the nearest half centimetre", () => {
  assert.equal(formatCm(84.449), "84.5 cm");
  assert.equal(formatCm(84.2), "84 cm");
  assert.equal(formatCm(84.76), "85 cm");
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './units.ts'`.

- [ ] **Step 4: Write `units.ts`**

```ts
// Ported from app.js: CM_PER_IN (L537), round1, cmToIn, inToCm, fmtIn (L537-547).
export const CM_PER_IN = 2.54;
export const round1 = (n: number) => Math.round(n * 10) / 10;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inch: number) => inch * CM_PER_IN;

const QUARTERS = ["", "¼", "½", "¾"];

/** Display only. Rounds to the nearest quarter inch, e.g. 33¼ in. */
export function formatIn(cm: number): string {
  const quarters = Math.round(cmToIn(cm) * 4);
  const whole = Math.floor(quarters / 4);
  return `${whole}${QUARTERS[quarters % 4]} in`;
}

/** Display only. Rounds to the nearest half centimetre, e.g. 84.5 cm. */
export function formatCm(cm: number): string {
  const half = Math.round(cm * 2) / 2;
  return `${Number.isInteger(half) ? half : half.toFixed(1)} cm`;
}
```

- [ ] **Step 5: Write `measures.ts`**

```ts
// Ported from app.js: VERIFY_FIELDS (L47-61), LM indices (L155-173), RATIOS (L176-190), GIRTH_KEYS (L431).
export const FIELDS = ["bust", "waist", "hip", "shoulder", "acrossBack", "armhole", "sleeve", "kameez", "neck", "salwar", "thigh", "knee", "ankle"] as const;
export type Field = (typeof FIELDS)[number];

export const GIRTH_KEYS: Field[] = ["bust", "waist", "hip", "neck", "armhole", "thigh", "knee", "ankle"];

export type Source = "ratio" | "ratio-clamped" | "landmark" | "landmark+side" | "calibrated" | "tailor-verified" | "saved-profile";
export type Mode = "none" | "landmarks" | "hybrid" | "ratio";
export type ScaleMethod = "nose-heel" | "nose-hip-fallback" | "shoulder-fallback" | "none";

export type Values = Record<Field, number>;

export interface Measures extends Values {
  sources: Record<Field, Source>;
  mode: Mode;
  scaleMethod: ScaleMethod;
  warnings: string[];
  calibrated?: boolean;
}

export interface Landmark { x: number; y: number; z?: number; visibility?: number; presence?: number }
export type Landmarks = Landmark[];

export const LM = {
  NOSE: 0, L_SHOULDER: 11, R_SHOULDER: 12, L_ELBOW: 13, R_ELBOW: 14, L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANKLE: 27, R_ANKLE: 28, L_HEEL: 29, R_HEEL: 30, L_FOOT: 31, R_FOOT: 32,
} as const;

export const RATIOS: Values = {
  bust: 0.515, waist: 0.40, hip: 0.54, shoulder: 0.229, acrossBack: 0.20, armhole: 0.24, sleeve: 0.31,
  kameez: 0.45, neck: 0.205, salwar: 0.60, thigh: 0.34, knee: 0.22, ankle: 0.14,
};
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (units and messages tests).

- [ ] **Step 7: Commit**

```bash
git add package.json src/lib/fit/units.ts src/lib/fit/measures.ts src/lib/fit/units.test.ts
git commit -m "Add fit engine units and measure types

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Styles and the height-ratio draft

**Files:**
- Create: `src/lib/fit/styles.ts`, `src/lib/fit/estimate.ts` (ratio part only for now), `src/lib/fit/styles.test.ts`

**Interfaces:**
- Consumes: `FIELDS`, `RATIOS`, `Measures`, `Values` from `measures.ts`; `round1` from `units.ts`.
- Produces: `StyleId = "punjabi" | "anarkali" | "sharara" | "farshi"`, `Style` (`id, label, note, kameezRatio, salwarRatio, kameezLabel, bottomTitle, bottomRows: {key: Field; label: string}[]`), `STYLES: Style[]`, `getStyle(id)`; `ratioMeasures(heightCm, kameezOverrideCm, styleId): Measures`.

- [ ] **Step 1: Write the failing tests**

`src/lib/fit/styles.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { STYLES, getStyle } from "./styles.ts";
import { ratioMeasures } from "./estimate.ts";
import { FIELDS } from "./measures.ts";

test("the four styles carry the prototype's ratios", () => {
  assert.deepEqual(STYLES.map(s => [s.id, s.kameezRatio, s.salwarRatio]), [
    ["punjabi", 0.45, 0.60], ["anarkali", 0.58, 0.58], ["sharara", 0.48, 0.62], ["farshi", 0.52, 0.66],
  ]);
  assert.equal(getStyle("sharara").bottomRows.map(r => r.label).join(" / "), "Sharara length / Thigh (flare start) / Knee / Flare / bottom opening");
});

test("ratioMeasures is height times RATIOS, with style kameez and salwar minus 2 cm", () => {
  const m = ratioMeasures(162.56, null, "punjabi");
  assert.equal(m.bust, 83.7);          // 162.56 * 0.515 = 83.72
  assert.equal(m.shoulder, 37.2);      // 162.56 * 0.229 = 37.23
  assert.equal(m.kameez, 73.2);        // 162.56 * 0.45
  assert.equal(m.salwar, 95.5);        // 162.56 * 0.60 - 2 = 95.54
  assert.equal(m.mode, "ratio");
  assert.equal(m.scaleMethod, "none");
  for (const f of FIELDS) assert.equal(m.sources[f], "ratio");
});

test("ratioMeasures honours a kameez override and the style ratios", () => {
  assert.equal(ratioMeasures(162.56, 90, "punjabi").kameez, 90);
  assert.equal(ratioMeasures(162.56, null, "anarkali").kameez, 94.3); // 162.56 * 0.58 = 94.28
  assert.equal(ratioMeasures(162.56, null, "farshi").salwar, 105.3);  // 162.56 * 0.66 - 2 = 105.29
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./styles.ts`.

- [ ] **Step 3: Write `styles.ts`**

Copy the label strings from `reference/measure-app/app.js` L71-144 exactly (they are internal labels, not customer copy, so the dash rule does not apply to `bottomRows` labels; the UI may still soften them).

```ts
import type { Field } from "./measures.ts";

// Ported from app.js STYLES (L71-144). Ratios are fractions of height.
export type StyleId = "punjabi" | "anarkali" | "sharara" | "farshi";

export interface Style {
  id: StyleId;
  label: string;
  note: string;             // one line under the card name (customer copy, written here)
  kameezRatio: number;
  salwarRatio: number;
  kameezLabel: string;      // waKameezLen in the prototype
  bottomTitle: string;      // waBottomTitle in the prototype
  bottomRows: { key: Field; label: string }[];
}

export const STYLES: Style[] = [
  { id: "punjabi", label: "Classic Punjabi suit", note: "Kameez to mid thigh, salwar below", kameezRatio: 0.45, salwarRatio: 0.60, kameezLabel: "Kameez length", bottomTitle: "Bottom (salwar)",
    bottomRows: [{ key: "salwar", label: "Salwar length" }, { key: "thigh", label: "Thigh" }, { key: "knee", label: "Knee" }, { key: "ankle", label: "Bottom / ankle opening" }] },
  { id: "anarkali", label: "Anarkali", note: "Long flared kameez, churidar under", kameezRatio: 0.58, salwarRatio: 0.58, kameezLabel: "Anarkali length", bottomTitle: "Bottom (under Anarkali)",
    bottomRows: [{ key: "salwar", label: "Churidar / salwar length" }, { key: "thigh", label: "Thigh" }, { key: "knee", label: "Knee" }, { key: "ankle", label: "Ankle" }] },
  { id: "sharara", label: "Sharara", note: "Short kameez, wide flared bottom", kameezRatio: 0.48, salwarRatio: 0.62, kameezLabel: "Kameez length (sharara set)", bottomTitle: "Bottom (sharara)",
    bottomRows: [{ key: "salwar", label: "Sharara length" }, { key: "thigh", label: "Thigh (flare start)" }, { key: "knee", label: "Knee" }, { key: "ankle", label: "Flare / bottom opening" }] },
  { id: "farshi", label: "Farshi", note: "Floor-length, trailing bottom", kameezRatio: 0.52, salwarRatio: 0.66, kameezLabel: "Kurti / kameez length (farshi)", bottomTitle: "Bottom (farshi)",
    bottomRows: [{ key: "salwar", label: "Farshi / floor length" }, { key: "thigh", label: "Thigh" }, { key: "knee", label: "Knee" }, { key: "ankle", label: "Bottom opening" }] },
];

export const getStyle = (id: StyleId): Style => STYLES.find(s => s.id === id) ?? STYLES[0];
```

Before committing, open `app.js` L71-144 and make the `bottomRows` labels match the prototype exactly for all four styles (the sharara row is confirmed above; check the other three and correct them).

- [ ] **Step 4: Write the ratio part of `estimate.ts`**

```ts
import { FIELDS, RATIOS, type Field, type Measures, type Source } from "./measures.ts";
import { round1 } from "./units.ts";
import { getStyle, type StyleId } from "./styles.ts";

const allSources = (s: Source) => Object.fromEntries(FIELDS.map(f => [f, s])) as Record<Field, Source>;

// Ported from app.js ratioMeasures (L556-581).
export function ratioMeasures(heightCm: number, kameezOverrideCm: number | null, styleId: StyleId): Measures {
  const style = getStyle(styleId);
  const out = {} as Measures;
  for (const f of FIELDS) out[f] = round1(heightCm * RATIOS[f]);
  out.kameez = round1(kameezOverrideCm || heightCm * style.kameezRatio);
  out.salwar = round1(Math.max(0, heightCm * style.salwarRatio - 2));
  out.sources = allSources("ratio");
  out.mode = "ratio";
  out.scaleMethod = "none";
  out.warnings = [];
  return out;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fit/styles.ts src/lib/fit/estimate.ts src/lib/fit/styles.test.ts
git commit -m "Add fit styles and height-ratio draft

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Scale, girth model and landmark estimator

**Files:**
- Create: `src/lib/fit/fixtures.ts` (test helper, not shipped), `src/lib/fit/estimate.test.ts`
- Modify: `src/lib/fit/estimate.ts`

**Interfaces:**
- Consumes: `LM`, `RATIOS`, `Landmarks`, `Measures` (Task 1), `ratioMeasures`, `getStyle` (Task 2).
- Produces: `cmPerPxFromHeight(lm, imgW, imgH, heightCm): { cmPerPx: number | null; method: ScaleMethod; warning: string | null }`, `girthCircumference(frontWidthCm, depthCm | null, depthK = 0.95)`, `landmarkMeasures(input: { front: {lm, w, h}; side?: {lm, w, h} | null; heightCm; kameezOverrideCm: number | null; styleId }): Measures`, `makeLandmarks(spec)` in fixtures.

- [ ] **Step 1: Write the fixture helper**

`src/lib/fit/fixtures.ts`:

```ts
import { LM, type Landmarks } from "./measures.ts";

type Spec = Partial<Record<keyof typeof LM, [x: number, y: number, visibility?: number]>>;

/** 33 landmarks, all (0.5, 0.5, vis 1) unless listed. Coordinates are normalised like MediaPipe. */
export function makeLandmarks(spec: Spec): Landmarks {
  const lm: Landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  for (const [name, [x, y, visibility = 1]] of Object.entries(spec) as [keyof typeof LM, [number, number, number?]][]) {
    lm[LM[name]] = { x, y, visibility };
  }
  return lm;
}

/** A clean, upright, full-body front pose in a 1000 by 2000 image. Height 64 in. */
export const FRONT = makeLandmarks({
  NOSE: [0.5, 0.10],
  L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25],
  L_ELBOW: [0.25, 0.40], R_ELBOW: [0.75, 0.40],
  L_WRIST: [0.22, 0.55], R_WRIST: [0.78, 0.55],
  L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55],
  L_KNEE: [0.40, 0.75], R_KNEE: [0.60, 0.75],
  L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93],
  L_HEEL: [0.42, 0.95], R_HEEL: [0.58, 0.95],
  L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95],
});

/** A clean profile with a 0.20 torso depth span. */
export const SIDE = makeLandmarks({
  NOSE: [0.62, 0.10],
  L_SHOULDER: [0.50, 0.25], R_SHOULDER: [0.52, 0.25],
  L_HIP: [0.44, 0.55], R_HIP: [0.42, 0.55],
  L_ANKLE: [0.48, 0.93], R_ANKLE: [0.48, 0.93],
  L_HEEL: [0.48, 0.95], R_HEEL: [0.48, 0.95],
  L_FOOT: [0.48, 0.95], R_FOOT: [0.48, 0.95],
});

export const IMG = { w: 1000, h: 2000 };
export const HEIGHT_64_IN = 162.56;
```

- [ ] **Step 2: Write the failing tests**

`src/lib/fit/estimate.test.ts` (expected values were computed by hand from the prototype's formulas; the comments show the arithmetic):

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cmPerPxFromHeight, girthCircumference, landmarkMeasures } from "./estimate.ts";
import { FRONT, SIDE, IMG, HEIGHT_64_IN, makeLandmarks } from "./fixtures.ts";
import { FIELDS } from "./measures.ts";

test("scale comes from the nose-to-heel span when the feet are in frame", () => {
  const s = cmPerPxFromHeight(FRONT, IMG.w, IMG.h, HEIGHT_64_IN);
  assert.equal(s.method, "nose-heel");
  assert.equal(s.warning, null);
  assert.equal(s.cmPerPx!.toFixed(5), "0.08893"); // 162.56 * 0.93 / ((0.95 - 0.10) * 2000)
});

test("scale falls back to the torso when the feet are cropped", () => {
  const cropped = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55],
    L_ANKLE: [0.42, 0.80], R_ANKLE: [0.58, 0.80], L_HEEL: [0.42, 0.80], R_HEEL: [0.58, 0.80], L_FOOT: [0.42, 0.80], R_FOOT: [0.58, 0.80] });
  const s = cmPerPxFromHeight(cropped, IMG.w, IMG.h, HEIGHT_64_IN);
  assert.equal(s.method, "nose-hip-fallback");
  assert.equal(s.cmPerPx!.toFixed(5), "0.06502"); // 162.56 * 0.36 / ((0.55 - 0.10) * 2000)
  assert.match(s.warning!, /Feet look cropped/);
});

test("girth is the RMS ellipse with depth and F * pi * k without", () => {
  assert.equal(girthCircumference(35.785, 18.675).toFixed(2), "89.67");
  assert.equal(girthCircumference(30, null).toFixed(2), "89.54"); // 30 * pi * 0.95
  assert.equal(girthCircumference(30, null, 2).toFixed(2), "98.96"); // k clamped to 1.05
  assert.equal(girthCircumference(0, 10), 0);
});

test("front-only estimate: widths from joints, clamp to height ratios, mode hybrid", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  assert.equal(m.mode, "hybrid");
  assert.equal(m.scaleMethod, "nose-heel");
  assert.equal(m.shoulder, 37.4);                // 420 px * 0.08893
  assert.equal(m.sources.shoulder, "landmark");
  assert.equal(m.acrossBack, 32.9);              // shoulder * 0.88
  assert.equal(m.hip, 90.2);                     // 340 px -> 30.236 cm * pi * 0.95
  assert.equal(m.sources.hip, "landmark");
  assert.equal(m.bust, 83.7);                    // 106.8 exceeds 0.515 * H * 1.15, so clamped to the ratio
  assert.equal(m.sources.bust, "ratio-clamped");
  assert.equal(m.sleeve, 53.7);                  // hypot(70, 600) px * 0.08893
  assert.equal(m.kameez, 69.4);                  // shoulder mid to 45% hip-to-knee: 780 px
  assert.equal(m.salwar, 94.3);                  // floor H * (0.60 - 0.02) wins over 760 px - 2
  assert.equal(m.armhole, 35.8);                 // floor 0.22 * H wins
  assert.equal(m.neck, 29.3);                    // floor 0.18 * H wins
  for (const f of FIELDS) assert.ok(Number.isFinite(m[f]), f);
});

test("front and side estimate: depth from the profile, mode landmarks", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: { lm: SIDE, ...IMG }, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  assert.equal(m.mode, "landmarks");
  assert.equal(m.bust, 89.7);                    // ellipse of 35.785 by 18.675 (depth 17.786 * 1.05)
  assert.equal(m.sources.bust, "landmark+side");
  assert.equal(m.hip, 79.6);                     // ellipse of 30.236 by 19.209
  assert.equal(m.waist, 65.0);                   // 83.7 exceeds 0.40 * H * 1.15, so clamped
  assert.equal(m.sources.waist, "ratio-clamped");
  assert.deepEqual(m.warnings, []);
});

test("non-Punjabi styles take kameez from height, and an override wins", () => {
  const a = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "anarkali" });
  assert.equal(a.kameez, 94.3);                  // 0.58 * H
  const o = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: 80, styleId: "anarkali" });
  assert.equal(o.kameez, 80);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `cmPerPxFromHeight` is not exported.

- [ ] **Step 4: Port the scale, geometry and girth helpers into `estimate.ts`**

Append to `estimate.ts` (keep `ratioMeasures`). Port from `app.js` L412-444 (helpers), L453-504 (`cmPerPxFromHeight`), L515-525 (`girthCircumference`):

```ts
import { LM, type Landmarks, type ScaleMethod } from "./measures.ts";

const DEPTH_K_FRONT = 0.95, CLAMP_LO = 0.85, CLAMP_HI = 1.15;

// Ported from app.js lmVis (L438-444): visibility, else presence, else 1; 0 when missing.
const lmVis = (lm: Landmarks, i: number) => { const p = lm[i]; if (!p) return 0; return p.visibility ?? p.presence ?? 1; };
// Ported from app.js lmDist, mid, lerpPt (L412-428).
const lmDist = (lm: Landmarks, a: number, b: number, w: number, h: number) => Math.hypot((lm[a].x - lm[b].x) * w, (lm[a].y - lm[b].y) * h);
const mid = (lm: Landmarks, a: number, b: number) => ({ x: (lm[a].x + lm[b].x) / 2, y: (lm[a].y + lm[b].y) / 2 });
const lerpPt = (p: { x: number; y: number }, q: { x: number; y: number }, t: number) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

// Ported from app.js cmPerPxFromHeight (L453-504).
export function cmPerPxFromHeight(lm: Landmarks, imgW: number, imgH: number, heightCm: number): { cmPerPx: number | null; method: ScaleMethod; warning: string | null } {
  const noseY = lm[LM.NOSE].y;
  const ankleY = Math.max(lm[LM.L_ANKLE].y, lm[LM.R_ANKLE].y);
  const heelY = Math.max(lm[LM.L_HEEL]?.y ?? 0, lm[LM.R_HEEL]?.y ?? 0);
  const footY = Math.max(lm[LM.L_FOOT]?.y ?? 0, lm[LM.R_FOOT]?.y ?? 0);
  const bottomY = Math.max(ankleY, heelY, footY);
  const ankleVis = Math.min(lmVis(lm, LM.L_ANKLE), lmVis(lm, LM.R_ANKLE));
  const heelVis = Math.min(lmVis(lm, LM.L_HEEL), lmVis(lm, LM.R_HEEL));
  const footVis = Math.min(lmVis(lm, LM.L_FOOT), lmVis(lm, LM.R_FOOT));
  const feetVis = Math.max(ankleVis, heelVis, footVis);
  const feetOk = bottomY >= 0.88 && feetVis >= 0.45 && bottomY <= 0.995;
  if (feetOk) {
    const spanPx = Math.abs(bottomY - noseY) * imgH;
    if (spanPx >= 10) return { cmPerPx: (heightCm * 0.93) / spanPx, method: "nose-heel", warning: null };
  }
  const hipMid = mid(lm, LM.L_HIP, LM.R_HIP);
  const torsoPx = Math.abs(hipMid.y - noseY) * imgH;
  if (torsoPx >= 10) return { cmPerPx: (heightCm * 0.36) / torsoPx, method: "nose-hip-fallback", warning: "Feet look cropped or unclear, scaled from torso vs height. Retake with full feet in frame." };
  const shoulderPx = lmDist(lm, LM.L_SHOULDER, LM.R_SHOULDER, imgW, imgH);
  if (shoulderPx >= 5) return { cmPerPx: (heightCm * RATIOS.shoulder) / shoulderPx, method: "shoulder-fallback", warning: "Could not use full-body scale, using shoulder vs height. Retake full-body with feet visible." };
  return { cmPerPx: null, method: "none", warning: "Could not derive scale from pose." };
}

// Ported from app.js girthCircumference (L515-525).
export function girthCircumference(frontFullWidth: number, depthFull: number | null = null, depthK = DEPTH_K_FRONT): number {
  const F = Math.max(frontFullWidth, 0);
  if (!F) return 0;
  if (depthFull != null && depthFull > 0) { const a = F / 2, b = depthFull / 2; return 2 * Math.PI * Math.sqrt((a * a + b * b) / 2); }
  const k = Math.min(1.05, Math.max(0.92, depthK));
  return F * Math.PI * k;
}
```

The two warning strings above replace the prototype's em dashes with commas; they are internal `warnings` and the UI (Task 13) decides what customers see.

- [ ] **Step 5: Port `landmarkMeasures`**

Port from `app.js` L728-862, following this structure exactly (open the file beside you and check each constant):

```ts
export interface PoseImage { lm: Landmarks; w: number; h: number }

// Ported from app.js landmarkMeasures (L728-862).
export function landmarkMeasures(input: { front: PoseImage; side?: PoseImage | null; heightCm: number; kameezOverrideCm: number | null; styleId: StyleId }): Measures {
  const { front, side, heightCm, kameezOverrideCm, styleId } = input;
  const style = getStyle(styleId);
  const base = ratioMeasures(heightCm, kameezOverrideCm, styleId);
  const warnings: string[] = [];
  const f = front.lm, fw = front.w, fh = front.h;
  const scale = cmPerPxFromHeight(f, fw, fh, heightCm);
  if (scale.warning) warnings.push(scale.warning);
  if (!scale.cmPerPx) return { ...base, mode: "ratio", scaleMethod: "none", warnings };
  const cmPerPx = scale.cmPerPx;
  const widthCm = (a: number, b: number) => lmDist(f, a, b, fw, fh) * cmPerPx;   // horizWidthCm (L506)

  const shoulder = widthCm(LM.L_SHOULDER, LM.R_SHOULDER);
  const acrossBack = shoulder * 0.88;
  const lineW = (t: number) => { const l = lerpPt(f[LM.L_SHOULDER], f[LM.L_HIP], t), r = lerpPt(f[LM.R_SHOULDER], f[LM.R_HIP], t); return Math.hypot((l.x - r.x) * fw, (l.y - r.y) * fh) * cmPerPx; };
  const bustFrontW = lineW(0.22), waistFrontW = lineW(0.48);
  const hipFrontW = widthCm(LM.L_HIP, LM.R_HIP);

  let bustDepth: number | null = null, waistDepth: number | null = null, hipDepth: number | null = null, usedSide = false;
  if (side) {
    const sideScale = cmPerPxFromHeight(side.lm, side.w, side.h, heightCm);
    const sideCm = sideScale.cmPerPx || cmPerPx;
    if (sideScale.warning) warnings.push("Side: " + sideScale.warning);
    const xs = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP].map(i => side.lm[i].x);
    const torsoDepthCm = (Math.max(...xs) - Math.min(...xs)) * side.w * sideCm;
    const depthClamped = Math.min(heightCm * 0.22, Math.max(heightCm * 0.10, torsoDepthCm));
    if (torsoDepthCm < heightCm * 0.08 || torsoDepthCm > heightCm * 0.28) warnings.push("Side depth looked extreme, clamped to body norms.");
    bustDepth = depthClamped * 1.05; waistDepth = depthClamped * 0.92; hipDepth = depthClamped * 1.08; usedSide = true;
  }

  const sleeve = ((lmDist(f, LM.L_SHOULDER, LM.L_WRIST, fw, fh) + lmDist(f, LM.R_SHOULDER, LM.R_WRIST, fw, fh)) * cmPerPx) / 2;
  const upperArm = lmDist(f, LM.L_SHOULDER, LM.L_ELBOW, fw, fh) * cmPerPx * 0.22;
  const armhole = Math.max(upperArm * 2 * Math.PI * 0.55, heightCm * 0.22);
  const shoulderMid = mid(f, LM.L_SHOULDER, LM.R_SHOULDER), hipMid = mid(f, LM.L_HIP, LM.R_HIP), kneeMid = mid(f, LM.L_KNEE, LM.R_KNEE), ankleMid = mid(f, LM.L_ANKLE, LM.R_ANKLE);
  const midThigh = lerpPt(hipMid, kneeMid, 0.45);
  let kameez = Math.hypot((shoulderMid.x - midThigh.x) * fw, (shoulderMid.y - midThigh.y) * fh) * cmPerPx;
  if (kameezOverrideCm) kameez = kameezOverrideCm; else if (style.kameezRatio > 0.46) kameez = heightCm * style.kameezRatio;
  const neck = Math.max(shoulder * 0.38 * Math.PI * 0.55, heightCm * 0.18);
  const salwarRaw = Math.hypot((hipMid.x - ankleMid.x) * fw, (hipMid.y - ankleMid.y) * fh) * cmPerPx - 2;
  const salwar = Math.max(salwarRaw, heightCm * ((style.salwarRatio || 0.6) - 0.02));
  const thigh = girthCircumference(hipFrontW * 0.48, usedSide ? hipDepth! * 0.7 : null);
  const kneeW = widthCm(LM.L_KNEE, LM.R_KNEE);
  const knee = Math.max(heightCm * RATIOS.knee * 0.5 + kneeW * 0.15, heightCm * 0.18);
  const ankleW = widthCm(LM.L_ANKLE, LM.R_ANKLE);
  const ankle = Math.max(heightCm * 0.12, (ankleW / 2) * 0.55 * Math.PI);

  const raw: Values = {
    bust: girthCircumference(bustFrontW, bustDepth), waist: girthCircumference(waistFrontW, waistDepth), hip: girthCircumference(hipFrontW, hipDepth),
    shoulder, acrossBack, armhole, sleeve, kameez, neck, salwar, thigh, knee, ankle,
  };
  const out = { ...base, warnings, mode: usedSide ? "landmarks" : "hybrid", scaleMethod: scale.method, sources: { ...base.sources } } as Measures;
  // Sanity clamp, ported from L848-860.
  for (const k of FIELDS) {
    const r = base[k], v = raw[k];
    if (!Number.isFinite(v) || v < r * CLAMP_LO || v > r * CLAMP_HI) { out[k] = r; out.sources[k] = "ratio-clamped"; }
    else { out[k] = round1(v); out.sources[k] = usedSide ? "landmark+side" : "landmark"; }
  }
  return out;
}
```

Add `Values` to the `measures.ts` import at the top of the file.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. If a value is off by 0.1, re-check the arithmetic in the comment before touching the formula; the formula must match `app.js`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/fit/estimate.ts src/lib/fit/fixtures.ts src/lib/fit/estimate.test.ts
git commit -m "Port the landmark measurement estimator

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Retake checks

**Files:**
- Create: `src/lib/fit/retake.ts`, `src/lib/fit/retake.test.ts`

**Interfaces:**
- Consumes: `LM`, `Landmarks` (Task 1), `makeLandmarks`, `FRONT`, `SIDE` (Task 3).
- Produces: `IssueCode = "no-front" | "too-small" | "feet-cropped" | "head-low" | "arms-blocking" | "shoulders-unclear" | "side-frontal" | "side-feet" | "no-side"`, `PoseIssue { code; hard: boolean; side: boolean }`, `PoseQuality { ok; hard; issues }`, `assessPoseQuality(front: Landmarks | null, side: Landmarks | null): PoseQuality`.

The prototype's tip strings contain em dashes and are replaced by codes here; customer wording lives in `pose-tips.tsx` (Task 13).

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessPoseQuality } from "./retake.ts";
import { FRONT, SIDE, makeLandmarks } from "./fixtures.ts";

const codes = (q: ReturnType<typeof assessPoseQuality>) => q.issues.map(i => i.code);

test("a clean front and side pass with no issues", () => {
  const q = assessPoseQuality(FRONT, SIDE);
  assert.equal(q.ok, true); assert.equal(q.hard, false); assert.deepEqual(q.issues, []);
});

test("missing front pose is hard", () => {
  const q = assessPoseQuality(null, SIDE);
  assert.equal(q.hard, true); assert.deepEqual(codes(q), ["no-front"]);
});

test("body too small in frame is hard", () => {
  const small = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.4, 0.2], R_SHOULDER: [0.6, 0.2], L_HIP: [0.45, 0.4], R_HIP: [0.55, 0.4], L_WRIST: [0.2, 0.3], R_WRIST: [0.8, 0.3],
    L_ANKLE: [0.45, 0.60], R_ANKLE: [0.55, 0.60], L_FOOT: [0.45, 0.60], R_FOOT: [0.55, 0.60] });
  assert.ok(codes(assessPoseQuality(small, null)).includes("too-small"));
});

test("feet cropped is hard, head low is soft", () => {
  const cropped = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55], L_WRIST: [0.22, 0.55], R_WRIST: [0.78, 0.55],
    L_ANKLE: [0.42, 0.80], R_ANKLE: [0.58, 0.80], L_FOOT: [0.42, 0.80], R_FOOT: [0.58, 0.80] });
  const q = assessPoseQuality(cropped, SIDE);
  assert.equal(q.hard, true); assert.ok(codes(q).includes("feet-cropped"));
  const low = makeLandmarks({ NOSE: [0.5, 0.25], L_SHOULDER: [0.29, 0.35], R_SHOULDER: [0.71, 0.35], L_HIP: [0.33, 0.6], R_HIP: [0.67, 0.6], L_WRIST: [0.22, 0.6], R_WRIST: [0.78, 0.6],
    L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93], L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95] });
  const s = assessPoseQuality(low, SIDE);
  assert.equal(s.hard, false); assert.deepEqual(codes(s), ["head-low"]);
});

test("a wrist inside the torso at waist height is hard", () => {
  const arms = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55], L_WRIST: [0.5, 0.45], R_WRIST: [0.78, 0.55],
    L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93], L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95] });
  const q = assessPoseQuality(arms, SIDE);
  assert.equal(q.hard, true); assert.deepEqual(codes(q), ["arms-blocking"]);
});

test("a frontal side photo is hard, a missing side photo is soft", () => {
  const frontal = assessPoseQuality(FRONT, FRONT);
  assert.equal(frontal.hard, true); assert.ok(codes(frontal).includes("side-frontal"));
  const none = assessPoseQuality(FRONT, null);
  assert.equal(none.hard, false); assert.deepEqual(codes(none), ["no-side"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./retake.ts`.

- [ ] **Step 3: Port `assessPoseQuality`**

Port from `app.js` L865-945. Each condition and threshold below is the prototype's:

```ts
import { LM, type Landmarks } from "./measures.ts";

export type IssueCode = "no-front" | "too-small" | "feet-cropped" | "head-low" | "arms-blocking" | "shoulders-unclear" | "side-frontal" | "side-feet" | "no-side";
export interface PoseIssue { code: IssueCode; hard: boolean; side: boolean }
export interface PoseQuality { ok: boolean; hard: boolean; issues: PoseIssue[] }

const vis = (lm: Landmarks, i: number) => { const p = lm[i]; if (!p) return 0; return p.visibility ?? p.presence ?? 1; };

// Ported from app.js assessPoseQuality (L865-945). Tips became codes; wording lives in the UI.
export function assessPoseQuality(front: Landmarks | null, side: Landmarks | null): PoseQuality {
  const issues: PoseIssue[] = [];
  const push = (code: IssueCode, hard: boolean, isSide = false) => issues.push({ code, hard, side: isSide });
  if (!front) { push("no-front", true); return { ok: false, hard: true, issues }; }

  const nose = front[LM.NOSE], lSho = front[LM.L_SHOULDER], rSho = front[LM.R_SHOULDER], lHip = front[LM.L_HIP], rHip = front[LM.R_HIP];
  const bottomY = Math.max(front[LM.L_ANKLE].y, front[LM.R_ANKLE].y, front[LM.L_FOOT]?.y || 0, front[LM.R_FOOT]?.y || 0);
  const feetVis = Math.max(Math.min(vis(front, LM.L_ANKLE), vis(front, LM.R_ANKLE)), Math.min(vis(front, LM.L_FOOT), vis(front, LM.R_FOOT)));

  if (bottomY - nose.y < 0.55) push("too-small", true);
  if (bottomY < 0.82 || feetVis < 0.4) push("feet-cropped", true);
  if (nose.y > 0.18) push("head-low", false);

  const hipMidX = (lHip.x + rHip.x) / 2;
  const torsoHalf = Math.abs(lHip.x - rHip.x) / 2 || 0.08;
  const blocking = (w: { x: number; y: number }) => Math.abs(w.x - hipMidX) < torsoHalf * 1.15 && w.y > (lSho.y + lHip.y) / 2 && w.y < lHip.y + 0.05;
  if (blocking(front[LM.L_WRIST]) || blocking(front[LM.R_WRIST])) push("arms-blocking", true);
  if (vis(front, LM.L_SHOULDER) < 0.5 || vis(front, LM.R_SHOULDER) < 0.5) push("shoulders-unclear", false);

  if (side) {
    const xs = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP].map(i => side[i].x);
    const depth = Math.max(...xs) - Math.min(...xs);
    const shoulderSpread = Math.abs(side[LM.L_SHOULDER].x - side[LM.R_SHOULDER].x);
    if (shoulderSpread > 0.12 && depth < 0.14) push("side-frontal", true, true);
    else if (shoulderSpread > 0.18) push("side-frontal", true, true);
    if (Math.max(side[LM.L_ANKLE].y, side[LM.R_ANKLE].y) < 0.82) push("side-feet", false, true);
  } else {
    push("no-side", false, true);
  }

  const hard = issues.some(i => i.hard);
  return { ok: !hard, hard, issues };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fit/retake.ts src/lib/fit/retake.test.ts
git commit -m "Port the pose retake checks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Tape calibration, fit preference and size advice

**Files:**
- Create: `src/lib/fit/calibrate.ts`, `src/lib/fit/fit-preference.ts`, `src/lib/fit/size-advice.ts`, `src/lib/fit/calibrate.test.ts`, `src/lib/fit/size-advice.test.ts`

**Interfaces:**
- Consumes: `Measures`, `GIRTH_KEYS`, `Field` (Task 1), `round1`, `CM_PER_IN` (Task 1), `ratioMeasures` (Task 2).
- Produces:
  - `applyTapeCalibration(raw: Measures, field: "bust" | "waist", tapeCm: number, lengthTapeCm?: number | null): { ok: true; measures: Measures; calibration: Calibration } | { ok: false; error: "tape-out-of-range" | "scale-out-of-range" }`, `Calibration { field; tapeCm; scale; lengthTapeCm: number | null }`.
  - `FitId = "fitted" | "regular" | "relaxed"`, `SleeveId`, `NecklineId`, `FIT_EASE`, `FIT_LABELS`, `SLEEVE_LABELS`, `NECKLINE_LABELS`, `FitPreference { fit; sleeve; neckline; lengthNote }`, `defaultPreference`.
  - `SIZE_CHART`, `SizeAdvice { size: "S"|"M"|"L"|"XL"|"Custom"; closest: "S"|"M"|"L"|"XL"; mtm: boolean; reasons: ReasonCode[]; bustIn; waistIn; hipIn; easeCm }`, `recommendSize(m: Measures, fit: FitId): SizeAdvice`, `sizeAdviceLine(a: SizeAdvice): string` (customer copy, no dashes).

- [ ] **Step 1: Write the failing calibration tests**

`src/lib/fit/calibrate.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTapeCalibration } from "./calibrate.ts";
import { ratioMeasures } from "./estimate.ts";

const raw = ratioMeasures(162.56, null, "punjabi"); // bust 83.7, waist 65.0, hip 87.8, shoulder 37.2, kameez 73.2, sleeve 50.4, salwar 95.5

test("one bust tape scales every girth and marks them calibrated", () => {
  const r = applyTapeCalibration(raw, "bust", 86);
  assert.equal(r.ok, true); if (!r.ok) return;
  assert.equal(r.measures.bust, 86);
  assert.equal(r.measures.waist, 66.8);      // 65.0 * 86 / 83.7
  assert.equal(r.measures.hip, 90.2);        // 87.8 * 1.02748
  assert.equal(r.measures.shoulder, 37.2);   // lengths are not scaled
  assert.equal(r.measures.sources.waist, "calibrated");
  assert.equal(r.measures.sources.shoulder, "ratio");
  assert.equal(r.measures.calibrated, true);
  assert.deepEqual(r.calibration, { field: "bust", tapeCm: 86, scale: 1.0275, lengthTapeCm: null });
  assert.equal(raw.waist, 65.0, "input is not mutated");
});

test("a kameez length tape scales kameez, sleeve and salwar", () => {
  const r = applyTapeCalibration(raw, "waist", 65, 80);
  assert.equal(r.ok, true); if (!r.ok) return;
  assert.equal(r.measures.kameez, 80);
  assert.equal(r.measures.sleeve, 55.1);     // 50.4 * 80 / 73.2
  assert.equal(r.measures.salwar, 104.4);    // 95.5 * 1.0929
  assert.equal(r.calibration.lengthTapeCm, 80);
});

test("unrealistic tapes and scales are refused", () => {
  assert.deepEqual(applyTapeCalibration(raw, "bust", 30), { ok: false, error: "tape-out-of-range" });
  assert.deepEqual(applyTapeCalibration(raw, "bust", 161), { ok: false, error: "tape-out-of-range" });
  assert.deepEqual(applyTapeCalibration(raw, "bust", 58), { ok: false, error: "scale-out-of-range" }); // 58 / 83.7 = 0.69
});
```

- [ ] **Step 2: Write the failing size-advice tests**

`src/lib/fit/size-advice.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendSize, sizeAdviceLine } from "./size-advice.ts";
import { ratioMeasures } from "./estimate.ts";
import { FIT_EASE } from "./fit-preference.ts";

const withGirths = (bust: number, waist: number, hip: number) => ({ ...ratioMeasures(162.56, null, "punjabi"), bust, waist, hip });

test("ease values match the prototype", () => {
  assert.deepEqual(FIT_EASE, { fitted: -1.0, regular: 0, relaxed: 2.5 });
});

test("34 / 27 / 36 in regular is a ready S", () => {
  const a = recommendSize(withGirths(86.4, 68.6, 91.4), "regular");
  assert.equal(a.size, "S"); assert.equal(a.closest, "S"); assert.equal(a.mtm, false);
  assert.equal(sizeAdviceLine(a), "Your closest Gulmohar size is S. Ready stock is possible.");
});

test("38 / 32 / 44 in is closest to L but the hip needs made to measure", () => {
  const a = recommendSize(withGirths(96.5, 81.3, 111.8), "regular");
  assert.equal(a.size, "L"); assert.equal(a.closest, "L"); assert.equal(a.mtm, true);
  assert.ok(a.reasons.includes("hip-over"));
  assert.equal(sizeAdviceLine(a), "Your closest Gulmohar size is L. We recommend made to measure because the hip needs 2 in more than the L chart.");
});

test("a bust outside 34 to 42 in is Custom with the nearest band as closest", () => {
  const a = recommendSize(withGirths(112, 81.3, 111.8), "regular");
  assert.equal(a.size, "Custom"); assert.equal(a.closest, "XL"); assert.equal(a.mtm, true);
  assert.ok(a.reasons.includes("bust-outside-band"));
});

test("fitted ease lowers the girths before the chart (prototype behaviour, see Decisions 3)", () => {
  const a = recommendSize(withGirths(86.4, 68.6, 91.4), "fitted");
  assert.equal(a.bustIn.toFixed(2), "33.62");
  assert.equal(a.size, "Custom");
});

test("relaxed ease adds room and notes it", () => {
  const a = recommendSize(withGirths(86.4, 68.6, 91.4), "relaxed");
  assert.equal(a.size, "S"); assert.equal(a.mtm, false); assert.ok(a.reasons.includes("relaxed-room"));
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL on missing modules.

- [ ] **Step 4: Write `fit-preference.ts`**

```ts
// Ported from app.js FIT_LABELS, SLEEVE_LABELS, NECKLINE_LABELS, FIT_EASE (L33-45).
export type FitId = "fitted" | "regular" | "relaxed";
export type SleeveId = "full" | "three-quarter" | "cap" | "sleeveless";
export type NecklineId = "round" | "v" | "boat" | "collar";

export const FIT_EASE: Record<FitId, number> = { fitted: -1.0, regular: 0, relaxed: 2.5 }; // cm
export const FIT_LABELS: Record<FitId, string> = { fitted: "Fitted", regular: "Regular", relaxed: "Relaxed" };
export const SLEEVE_LABELS: Record<SleeveId, string> = { full: "Full sleeve", "three-quarter": "Three-quarter sleeve", cap: "Cap sleeve", sleeveless: "Sleeveless" };
export const NECKLINE_LABELS: Record<NecklineId, string> = { round: "Round", v: "V-neck", boat: "Boat", collar: "Collar" };

export interface FitPreference { fit: FitId; sleeve: SleeveId; neckline: NecklineId; lengthNote: string }
export const defaultPreference: FitPreference = { fit: "regular", sleeve: "full", neckline: "round", lengthNote: "" };
```

- [ ] **Step 5: Write `calibrate.ts`**

```ts
import { GIRTH_KEYS, type Measures } from "./measures.ts";
import { round1 } from "./units.ts";

export interface Calibration { field: "bust" | "waist"; tapeCm: number; scale: number; lengthTapeCm: number | null }
export type CalibrationResult = { ok: true; measures: Measures; calibration: Calibration } | { ok: false; error: "tape-out-of-range" | "scale-out-of-range" };

// Ported from app.js applyTapeCalibration (L1284-1345). Pure: returns a new Measures, never mutates raw.
export function applyTapeCalibration(raw: Measures, field: "bust" | "waist", tapeCm: number, lengthTapeCm: number | null = null): CalibrationResult {
  if (!tapeCm || tapeCm < 40 || tapeCm > 160) return { ok: false, error: "tape-out-of-range" };
  const scale = tapeCm / raw[field];
  if (scale < 0.7 || scale > 1.4) return { ok: false, error: "scale-out-of-range" };
  const next: Measures = { ...raw, sources: { ...raw.sources }, warnings: [...raw.warnings] };
  for (const k of GIRTH_KEYS) { next[k] = round1(raw[k] * scale); next.sources[k] = "calibrated"; }
  next[field] = round1(tapeCm);
  let lengthScale: number | null = null;
  if (lengthTapeCm && lengthTapeCm > 20 && lengthTapeCm < 180 && raw.kameez) {
    lengthScale = lengthTapeCm / raw.kameez;
    if (lengthScale >= 0.7 && lengthScale <= 1.4) {
      for (const k of ["kameez", "sleeve", "salwar"] as const) { next[k] = round1(raw[k] * lengthScale); next.sources[k] = "calibrated"; }
      next.kameez = round1(lengthTapeCm);
    } else lengthScale = null;
  }
  next.calibrated = true;
  return { ok: true, measures: next, calibration: { field, tapeCm: round1(tapeCm), scale: round1(scale * 1000) / 1000, lengthTapeCm: lengthScale ? round1(lengthTapeCm!) : null } };
}
```

- [ ] **Step 6: Write `size-advice.ts`**

Port the algorithm from `app.js` L595-726. Reason strings become codes; `sizeAdviceLine` is our customer copy.

```ts
import type { Measures } from "./measures.ts";
import { CM_PER_IN, round1 } from "./units.ts";
import { FIT_EASE, type FitId } from "./fit-preference.ts";

// Ported from app.js SIZE_CHART (L147-152). Inches.
export const SIZE_CHART = [
  { size: "S",  bustMin: 34, bustMax: 36, waistMin: 26, waistMax: 28, hipMin: 36, hipMax: 38 },
  { size: "M",  bustMin: 36, bustMax: 38, waistMin: 28, waistMax: 30, hipMin: 38, hipMax: 40 },
  { size: "L",  bustMin: 38, bustMax: 40, waistMin: 30, waistMax: 32, hipMin: 40, hipMax: 42 },
  { size: "XL", bustMin: 40, bustMax: 42, waistMin: 32, waistMax: 34, hipMin: 42, hipMax: 44 },
] as const;
export type Band = (typeof SIZE_CHART)[number];
export type ReadySize = Band["size"];
export type ReasonCode = "bust-outside-band" | "hip-over" | "waist-over" | "bust-over" | "below-chart" | "relaxed-room" | "fitted-little-ease" | "fitted-near-top";

export interface SizeAdvice { size: ReadySize | "Custom"; closest: ReadySize; mtm: boolean; reasons: ReasonCode[]; bustIn: number; waistIn: number; hipIn: number; easeCm: number; hipOver: number; waistOver: number; bustOver: number }

const overIn = (v: number, max: number) => (v <= max ? 0 : round1(v - max));
const underIn = (v: number, min: number) => (v >= min ? 0 : round1(min - v));

// Ported from app.js recommendSize (L595-726).
export function recommendSize(m: Measures, fit: FitId): SizeAdvice {
  const ease = FIT_EASE[fit] ?? 0;
  const bustIn = (m.bust + ease) / CM_PER_IN, waistIn = (m.waist + ease) / CM_PER_IN, hipIn = (m.hip + ease) / CM_PER_IN;
  const scored = SIZE_CHART.map(band => {
    const score = Math.abs(bustIn - (band.bustMin + band.bustMax) / 2) + Math.abs(waistIn - (band.waistMin + band.waistMax) / 2) * 0.85 + Math.abs(hipIn - (band.hipMin + band.hipMax) / 2) * 0.9;
    let ok = 0;
    if (bustIn >= band.bustMin - 0.15 && bustIn <= band.bustMax + 0.15) ok++;
    if (waistIn >= band.waistMin - 0.2 && waistIn <= band.waistMax + 0.2) ok++;
    if (hipIn >= band.hipMin - 0.2 && hipIn <= band.hipMax + 0.2) ok++;
    return { band, score, ok };
  }).sort((a, b) => a.score - b.score || b.ok - a.ok);
  const band = scored[0].band;
  const reasons: ReasonCode[] = [];
  let size: ReadySize | "Custom" = band.size, mtm = false;
  const custom = bustIn < SIZE_CHART[0].bustMin - 0.2 || bustIn > SIZE_CHART[3].bustMax + 0.2;
  if (custom) { size = "Custom"; mtm = true; reasons.push("bust-outside-band"); }
  const hipOver = overIn(hipIn, band.hipMax), waistOver = overIn(waistIn, band.waistMax), bustOver = overIn(bustIn, band.bustMax);
  if (hipOver >= 0.8) { mtm = true; reasons.push("hip-over"); }
  if (waistOver >= 0.8) { mtm = true; reasons.push("waist-over"); }
  if (bustOver >= 0.8 && !custom) { mtm = true; reasons.push("bust-over"); }
  if (underIn(hipIn, band.hipMin) >= 1.2 || underIn(waistIn, band.waistMin) >= 1.2) reasons.push("below-chart");
  if (fit === "relaxed" && !custom && !mtm) reasons.push("relaxed-room");
  if (fit === "fitted" && !custom) { reasons.push("fitted-little-ease"); if (bustIn > band.bustMax - 0.4) { mtm = true; reasons.push("fitted-near-top"); } }
  return { size, closest: band.size, mtm: mtm || custom, reasons, bustIn, waistIn, hipIn, easeCm: ease, hipOver, waistOver, bustOver };
}

/** Customer copy. No dashes. */
export function sizeAdviceLine(a: SizeAdvice): string {
  const because: string[] = [];
  if (a.reasons.includes("bust-outside-band")) because.push("the bust is outside our S to XL ready band");
  if (a.reasons.includes("hip-over")) because.push(`the hip needs ${a.hipOver} in more than the ${a.closest} chart`);
  if (a.reasons.includes("waist-over")) because.push(`the waist needs ${a.waistOver} in more than the ${a.closest} chart`);
  if (a.reasons.includes("bust-over")) because.push(`the bust needs ${a.bustOver} in more than the ${a.closest} chart`);
  if (a.reasons.includes("fitted-near-top")) because.push("a fitted cut sits near the top of the bust band");
  if (a.mtm) return `Your closest Gulmohar size is ${a.closest}. We recommend made to measure${because.length ? " because " + because.join(" and ") : ""}.`;
  return `Your closest Gulmohar size is ${a.closest}. Ready stock is possible.`;
}
```

Compare each threshold with `app.js` L595-726 before committing. Check which band the prototype uses for `overIn` and `underIn` (the closest band) and that `custom` keeps `closest` as the best band.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. In the L case `hipOver` is `round1(44.02 - 42) = 2`, so the line reads "2 in".

- [ ] **Step 8: Commit**

```bash
git add src/lib/fit/calibrate.ts src/lib/fit/fit-preference.ts src/lib/fit/size-advice.ts src/lib/fit/calibrate.test.ts src/lib/fit/size-advice.test.ts
git commit -m "Port tape calibration, fit ease and size advice

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Per-field confidence

**Files:**
- Create: `src/lib/fit/confidence.ts`, `src/lib/fit/confidence.test.ts`

**Interfaces:**
- Consumes: `Measures`, `Landmarks`, `LM`, `GIRTH_KEYS`, `Field`, `FIELDS` (Task 1), `PoseQuality` (Task 4), fixtures (Task 3), `applyTapeCalibration` (Task 5).
- Produces: `computeConfidence(m: Measures, front: Landmarks | null, side: Landmarks | null, quality: PoseQuality | null, calibrated: boolean): Record<Field, number>`, `confidenceLevel(pct): "high" | "mid" | "low"`, `sourceLabel(source, field, styleId): string` (customer words: "from photo", "photo and side", "from height", "your tape", "tailor verified", "saved").

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConfidence, confidenceLevel, sourceLabel } from "./confidence.ts";
import { ratioMeasures, landmarkMeasures } from "./estimate.ts";
import { assessPoseQuality } from "./retake.ts";
import { applyTapeCalibration } from "./calibrate.ts";
import { FRONT, SIDE, IMG, HEIGHT_64_IN } from "./fixtures.ts";
import { FIELDS } from "./measures.ts";

test("height-only drafts are capped at 48 everywhere", () => {
  const c = computeConfidence(ratioMeasures(HEIGHT_64_IN, null, "punjabi"), null, null, null, false);
  for (const f of FIELDS) assert.equal(c[f], 48, f);  // 42 + 0.3 * 38 = 53.4, capped 55 for ratio, then 48 with no front
});

test("front-only: landmark fields gain 6, clamped fields lose 14", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const c = computeConfidence(m, FRONT, null, assessPoseQuality(FRONT, null), false);
  assert.equal(c.shoulder, 86 - 8);  // 42 + 38 + 6, minus 8 for the soft "no side" issue
  assert.equal(c.bust, 66 - 8);      // 42 + 38 - 14, minus 8
});

test("front and side: girths get the side boost and cap at 97", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: { lm: SIDE, ...IMG }, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const c = computeConfidence(m, FRONT, SIDE, assessPoseQuality(FRONT, SIDE), false);
  assert.equal(c.bust, 97);          // 42 + 38 + 10 + 12 = 102, capped
  assert.equal(c.shoulder, 90);      // 42 + 38 + 10 (source is landmark+side in landmarks mode), no side boost for lengths
});

test("a hard pose issue costs 18", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: { lm: SIDE, ...IMG }, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const c = computeConfidence(m, FRONT, SIDE, { ok: false, hard: true, issues: [{ code: "arms-blocking", hard: true, side: false }] }, false);
  assert.equal(c.shoulder, 72);      // 90 - 18
});

test("calibration lifts girths to at least 90 and is recomputed", () => {
  const m = landmarkMeasures({ front: { lm: FRONT, ...IMG }, side: null, heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" });
  const r = applyTapeCalibration(m, "bust", 86); if (!r.ok) throw new Error("expected ok");
  const c = computeConfidence(r.measures, FRONT, null, assessPoseQuality(FRONT, null), true);
  assert.equal(c.bust, 96 - 8);      // 80, +18 capped 96, then max(_, 90) capped 97, minus 8 soft penalty
  assert.equal(c.shoulder, 86 - 8);  // lengths unchanged
});

test("levels and labels", () => {
  assert.equal(confidenceLevel(85), "high"); assert.equal(confidenceLevel(70), "mid"); assert.equal(confidenceLevel(69), "low");
  assert.equal(sourceLabel("landmark+side", "bust", "punjabi"), "photo and side");
  assert.equal(sourceLabel("ratio-clamped", "bust", "punjabi"), "from height");
  assert.equal(sourceLabel("landmark", "kameez", "anarkali"), "from height"); // Decisions 2
  assert.equal(sourceLabel("landmark", "neck", "punjabi"), "from height");    // Decisions 1
  assert.equal(sourceLabel("calibrated", "bust", "punjabi"), "your tape");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./confidence.ts`.

- [ ] **Step 3: Port `computeConfidence`**

Port from `app.js` L972-1017:

```ts
import { FIELDS, GIRTH_KEYS, LM, type Field, type Landmarks, type Measures, type Source } from "./measures.ts";
import type { PoseQuality } from "./retake.ts";
import { getStyle, type StyleId } from "./styles.ts";

const META: Record<Field, { idx: number[]; sideBoost: number }> = {
  bust: { idx: [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP], sideBoost: 12 },
  waist: { idx: [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP], sideBoost: 12 },
  hip: { idx: [LM.L_HIP, LM.R_HIP], sideBoost: 10 },
  shoulder: { idx: [LM.L_SHOULDER, LM.R_SHOULDER], sideBoost: 0 },
  acrossBack: { idx: [LM.L_SHOULDER, LM.R_SHOULDER], sideBoost: 0 },
  armhole: { idx: [LM.L_SHOULDER, LM.L_ELBOW], sideBoost: 0 },
  sleeve: { idx: [LM.L_WRIST, LM.R_WRIST, LM.L_SHOULDER], sideBoost: 0 },
  kameez: { idx: [LM.L_SHOULDER, LM.L_HIP, LM.L_KNEE], sideBoost: 0 },
  neck: { idx: [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER], sideBoost: 0 },
  salwar: { idx: [LM.L_HIP, LM.L_ANKLE, LM.R_ANKLE], sideBoost: 0 },
  thigh: { idx: [LM.L_HIP, LM.L_KNEE], sideBoost: 6 },
  knee: { idx: [LM.L_KNEE, LM.R_KNEE], sideBoost: 0 },
  ankle: { idx: [LM.L_ANKLE, LM.R_ANKLE], sideBoost: 0 },
};
const vis = (lm: Landmarks, i: number) => { const p = lm[i]; if (!p) return 0; return p.visibility ?? p.presence ?? 1; };

// Ported from app.js computeConfidence (L972-1015). Unlike the prototype, callers re-run this after calibration.
export function computeConfidence(m: Measures, front: Landmarks | null, side: Landmarks | null, quality: PoseQuality | null, calibrated: boolean): Record<Field, number> {
  const hasSide = !!(side && m.mode === "landmarks");
  const penalty = quality?.hard ? 18 : quality?.issues.length ? 8 : 0;
  const out = {} as Record<Field, number>;
  for (const key of FIELDS) {
    const meta = META[key];
    const v = front ? meta.idx.reduce((s, i) => s + vis(front, i), 0) / meta.idx.length : 0.3;
    let c = 42 + v * 38;
    const src = m.sources[key] || "ratio";
    if (src === "ratio" || m.mode === "ratio") c = Math.min(c, 55);
    if (src === "ratio-clamped") c -= 14;
    if (src === "landmark") c += 6;
    if (src === "landmark+side") c += 10;
    if (hasSide) c += meta.sideBoost;
    if (calibrated && GIRTH_KEYS.includes(key)) c = Math.min(96, c + 18);
    if (calibrated && src === "calibrated") c = Math.min(97, Math.max(c, 90));
    c -= penalty;
    if (!front) c = Math.min(c, 48);
    out[key] = Math.max(25, Math.min(97, Math.round(c)));
  }
  return out;
}

// Ported from app.js L1017: 85 and up high, 70 and up mid.
export const confidenceLevel = (pct: number) => (pct >= 85 ? "high" : pct >= 70 ? "mid" : "low");

const HEIGHT_FLOOR_FIELDS: Field[] = ["neck", "armhole", "knee", "ankle"]; // Decisions 1

/** Customer-facing word for where a number came from. */
export function sourceLabel(source: Source, field: Field, styleId: StyleId): string {
  if (source === "calibrated") return "your tape";
  if (source === "tailor-verified") return "tailor verified";
  if (source === "saved-profile") return "saved";
  if (source === "ratio" || source === "ratio-clamped") return "from height";
  if (HEIGHT_FLOOR_FIELDS.includes(field)) return "from height";
  if (field === "kameez" && getStyle(styleId).kameezRatio > 0.46) return "from height"; // Decisions 2
  if (field === "salwar") return "from height"; // the height floor always wins in the prototype
  return source === "landmark+side" ? "photo and side" : "from photo";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fit/confidence.ts src/lib/fit/confidence.test.ts
git commit -m "Port per-field confidence with source labels

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: DRAFT code and WhatsApp messages

**Files:**
- Create: `src/lib/fit/handoff.ts`, `src/lib/fit/handoff.test.ts`
- Modify: `src/lib/enquiries/messages.ts`, `src/lib/enquiries/messages.test.ts`

**Interfaces:**
- Consumes: `Values`, `FIELDS`, `Measures` (Task 1), `StyleId`, `getStyle` (Task 2), `FitPreference`, labels (Task 5), `Calibration` (Task 5), `SizeAdvice`, `sizeAdviceLine` (Task 5), `formatIn`, `formatCm` (Task 1), `whatsappUrl` (existing).
- Produces: `DraftPayload { v: 1; style: StyleId; fit: FitId; heightCm: number; calibrated: boolean; m: Values }`, `encodeDraftCode(p): string` (`GW1.<base64url>.<4 chars>`), `decodeDraftCode(code): { ok: true; payload: DraftPayload } | { ok: false; error: "format" | "checksum" | "schema" }`; `composeMeasurementDraft(input: DraftMessageInput): string`, `composeOrderBrief(input: DraftMessageInput & { brief: OrderBrief }): string`, `OrderBrief { fabric; occasion; city; deadline; notes }` (all strings, may be empty).

- [ ] **Step 1: Write the failing handoff tests**

`src/lib/fit/handoff.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeDraftCode, decodeDraftCode, type DraftPayload } from "./handoff.ts";
import { ratioMeasures } from "./estimate.ts";
import { FIELDS } from "./measures.ts";

const m = ratioMeasures(162.56, null, "punjabi");
const payload: DraftPayload = { v: 1, style: "punjabi", fit: "regular", heightCm: 162.56, calibrated: false, m: Object.fromEntries(FIELDS.map(f => [f, m[f]])) as DraftPayload["m"] };

test("round trip", () => {
  const code = encodeDraftCode(payload);
  assert.match(code, /^GW1\.[A-Za-z0-9_-]+\.[a-z0-9]{4}$/);
  const d = decodeDraftCode(code);
  assert.equal(d.ok, true); if (d.ok) assert.deepEqual(d.payload, payload);
});

test("a copy and paste typo is caught by the checksum", () => {
  const code = encodeDraftCode(payload);
  const [prefix, body, sum] = code.split(".");
  const typo = `${prefix}.${body.slice(0, 10)}${body[10] === "A" ? "B" : "A"}${body.slice(11)}.${sum}`;
  assert.deepEqual(decodeDraftCode(typo), { ok: false, error: "checksum" });
});

test("wrong prefix and bad schema are refused", () => {
  assert.deepEqual(decodeDraftCode("GX1.abc.0000"), { ok: false, error: "format" });
  assert.deepEqual(decodeDraftCode("hello"), { ok: false, error: "format" });
  const bad = encodeDraftCode({ ...payload, style: "lehenga" as never });
  assert.deepEqual(decodeDraftCode(bad), { ok: false, error: "schema" });
});
```

- [ ] **Step 2: Write the failing message tests**

Append to `src/lib/enquiries/messages.test.ts` (keep the existing tests; match their import style):

```ts
import { composeMeasurementDraft, composeOrderBrief } from "./messages.ts";
import { ratioMeasures } from "../fit/estimate.ts";
import { recommendSize } from "../fit/size-advice.ts";
import { defaultPreference } from "../fit/fit-preference.ts";

const measures = ratioMeasures(162.56, null, "punjabi");
const draftInput = { name: "Simran", styleId: "punjabi" as const, preference: defaultPreference, heightCm: 162.56, measures, confidence: Object.fromEntries(Object.keys(measures.sources).map(k => [k, 48])) as Record<string, number>, calibration: null, advice: recommendSize(measures, "regular"), date: new Date("2026-10-03T12:00:00+05:30"), code: "GW1.abc.0000" };

test("the measurement draft is readable, inches first, with the DRAFT code last", () => {
  const text = composeMeasurementDraft(draftInput);
  const lines = text.split("\n");
  assert.equal(lines[0], "Gulmohar Wears, measurement DRAFT");
  assert.ok(lines.includes("Name: Simran"));
  assert.ok(lines.includes("Height: 64 in (162.5 cm)"));
  assert.ok(lines.includes("Photos: height only"));
  assert.ok(lines.includes("Bust: 33 in (83.5 cm), draft, confidence 48%"));
  assert.ok(lines.includes("Calibration: none yet. One tape measure of the bust or waist brings the girths much closer."));
  assert.equal(lines.at(-1), "Draft code: GW1.abc.0000");
  assert.doesNotMatch(text, /[—–]/);
});

test("the order brief lists fabric, occasion, city, deadline and notes", () => {
  const text = composeOrderBrief({ ...draftInput, brief: { fabric: "Silk", occasion: "Wedding", city: "Toronto", deadline: "2026-12-10", notes: "Boat neck" } });
  assert.equal(text.split("\n")[0], "Gulmohar Wears, order brief DRAFT");
  assert.ok(text.includes("Fabric preference: Silk"));
  assert.ok(text.includes("Deadline: 10 Dec 2026"));
  assert.ok(text.includes("Notes: Boat neck"));
  assert.doesNotMatch(text, /[—–]/);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL on missing exports.

- [ ] **Step 4: Write `handoff.ts`**

```ts
import { FIELDS, type Values } from "./measures.ts";
import { STYLES, type StyleId } from "./styles.ts";
import type { FitId } from "./fit-preference.ts";

export interface DraftPayload { v: 1; style: StyleId; fit: FitId; heightCm: number; calibrated: boolean; m: Values }
export type DecodeResult = { ok: true; payload: DraftPayload } | { ok: false; error: "format" | "checksum" | "schema" };

const PREFIX = "GW1";
const toB64Url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

/** FNV-1a over the body, 4 base36 characters. Catches copy and paste slips; not a security measure. */
function checksum(body: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, "0").slice(-4);
}

export function encodeDraftCode(p: DraftPayload): string {
  const body = toB64Url(JSON.stringify(p));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

export function decodeDraftCode(code: string): DecodeResult {
  const parts = code.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return { ok: false, error: "format" };
  if (checksum(parts[1]) !== parts[2]) return { ok: false, error: "checksum" };
  let p: unknown;
  try { p = JSON.parse(fromB64Url(parts[1])); } catch { return { ok: false, error: "format" }; }
  const o = p as Partial<DraftPayload>;
  const styleOk = STYLES.some(s => s.id === o.style);
  const fitOk = o.fit === "fitted" || o.fit === "regular" || o.fit === "relaxed";
  const valuesOk = !!o.m && FIELDS.every(f => typeof (o.m as Values)[f] === "number" && Number.isFinite((o.m as Values)[f]));
  if (o.v !== 1 || !styleOk || !fitOk || typeof o.heightCm !== "number" || typeof o.calibrated !== "boolean" || !valuesOk) return { ok: false, error: "schema" };
  return { ok: true, payload: { v: 1, style: o.style!, fit: o.fit!, heightCm: o.heightCm, calibrated: o.calibrated, m: o.m as Values } };
}
```

- [ ] **Step 5: Extend `messages.ts`**

Append (keep `composeEnquiry` and `whatsappUrl` as they are). The content follows the prototype's `buildWhatsAppCard` (L1456-1506) and `buildOrderBrief` (L1578-1631) but in the site's voice, without dashes:

```ts
import { FIELDS, type Field, type Measures } from "../fit/measures.ts";
import { getStyle, type StyleId } from "../fit/styles.ts";
import { FIT_LABELS, NECKLINE_LABELS, SLEEVE_LABELS, type FitPreference } from "../fit/fit-preference.ts";
import type { Calibration } from "../fit/calibrate.ts";
import { sizeAdviceLine, type SizeAdvice } from "../fit/size-advice.ts";
import { formatCm, formatIn } from "../fit/units.ts";

export interface OrderBrief { fabric: string; occasion: string; city: string; deadline: string; notes: string }
export interface DraftMessageInput {
  name: string; styleId: StyleId; preference: FitPreference; heightCm: number; measures: Measures;
  confidence: Record<string, number>; calibration: Calibration | null; advice: SizeAdvice; date: Date; code: string;
}

const UPPER_ROWS: [Field, string][] = [["bust", "Bust"], ["waist", "Waist"], ["hip", "Hip"], ["shoulder", "Shoulder"], ["acrossBack", "Across back"], ["armhole", "Armhole"], ["sleeve", "Sleeve length"], ["kameez", "Kameez length"], ["neck", "Neck"]];
const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "short", day: "numeric" });
const both = (cm: number) => `${formatIn(cm)} (${formatCm(cm)})`;

function draftHeader(i: DraftMessageInput, title: string): string[] {
  const style = getStyle(i.styleId);
  const photos = i.measures.mode === "landmarks" ? "front and side" : i.measures.mode === "hybrid" ? "front only" : "height only";
  const p = i.preference;
  return [
    `Gulmohar Wears, ${title}`,
    `Name: ${clean(i.name) || "not given"}`,
    `Style: ${style.label}`,
    `Fit: ${FIT_LABELS[p.fit]}. Sleeve: ${SLEEVE_LABELS[p.sleeve]}. Neckline: ${NECKLINE_LABELS[p.neckline]}.${p.lengthNote ? ` Length note: ${clean(p.lengthNote)}` : ""}`,
    `Height: ${both(i.heightCm)}`,
    `Date: ${formatDate(i.date)}`,
    `Photos: ${photos}`,
    `Size advice: ${sizeAdviceLine(i.advice)}`,
  ];
}

function measureLines(i: DraftMessageInput): string[] {
  const style = getStyle(i.styleId);
  const row = (key: Field, label: string) => `${label}: ${both(i.measures[key])}, draft, confidence ${i.confidence[key] ?? "?"}%`;
  return [
    "", "Kameez and upper",
    ...UPPER_ROWS.map(([k, l]) => row(k, k === "kameez" ? style.kameezLabel : l)),
    "", style.bottomTitle,
    ...style.bottomRows.map(r => row(r.key, r.label.replace(" / ", " or "))),
  ];
}

export function composeMeasurementDraft(i: DraftMessageInput): string {
  const cal = i.calibration
    ? `Calibration: ${i.calibration.field} tape ${formatIn(i.calibration.tapeCm)}, girths scaled to your tape.`
    : "Calibration: none yet. One tape measure of the bust or waist brings the girths much closer.";
  return [
    ...draftHeader(i, "measurement DRAFT"), cal,
    ...measureLines(i),
    "", "All numbers are photo estimates marked DRAFT. Our tailor verifies every measurement before cutting fabric.",
    "Ready stock size is a guide only, not a cut sheet.",
    `Draft code: ${i.code}`,
  ].join("\n");
}

export function composeOrderBrief(i: DraftMessageInput & { brief: OrderBrief }): string {
  const b = i.brief;
  const deadline = b.deadline ? formatDate(new Date(`${b.deadline}T12:00:00+05:30`)) : "not set";
  return [
    ...draftHeader(i, "order brief DRAFT"),
    "", "Order details",
    `Fabric preference: ${clean(b.fabric) || "not set"}`, `Occasion: ${clean(b.occasion) || "not set"}`,
    `Delivery city: ${clean(b.city) || "not set"}`, `Deadline: ${deadline}`, `Notes: ${clean(b.notes) || "none"}`,
    ...measureLines(i),
    "", "All numbers are photo estimates marked DRAFT. Our tailor verifies every measurement before cutting fabric.",
    `Draft code: ${i.code}`,
  ].join("\n");
}
```

`clean` already exists at the top of `messages.ts`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. `formatCm(162.56)` is "162.5 cm" and `formatIn(83.7)` is "33 in" (32.95 in rounds to 33).

- [ ] **Step 7: Commit**

```bash
git add src/lib/fit/handoff.ts src/lib/fit/handoff.test.ts src/lib/enquiries/messages.ts src/lib/enquiries/messages.test.ts
git commit -m "Add the DRAFT code and measurement WhatsApp messages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Saved profiles on this phone

**Files:**
- Create: `src/lib/fit/device-store.ts`, `src/lib/fit/device-store.test.ts`

**Interfaces:**
- Consumes: `Measures`, `Field` (Task 1), `StyleId` (Task 2), `FitPreference`, `Calibration` (Task 5), `OrderBrief` (Task 7).
- Produces: `StorageLike { getItem(k): string | null; setItem(k, v): void; removeItem(k): void }`, `SavedProfile { id; name; styleId; heightCm; kameezOverrideCm: number | null; preference; measures; rawMeasures: Measures | null; calibration: Calibration | null; confidence: Record<Field, number>; brief: OrderBrief | null; savedAt: string }`, `createProfileStore(storage: StorageLike | null)` returning `{ list(): SavedProfile[]; save(p: Omit<SavedProfile, "id" | "savedAt"> & { id?: string }): { ok: boolean; profile?: SavedProfile }; remove(id): boolean; clear(): boolean; isStale(p, now?): boolean }`, `browserProfileStore()` (wraps `window.localStorage`, returns a store over `null` when unavailable), `PROFILE_KEY = "gulmohar_fit_profile_v1"`, `MAX_PROFILES = 10`, `SIX_MONTHS_MS`.

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProfileStore, PROFILE_KEY, SIX_MONTHS_MS, type StorageLike } from "./device-store.ts";
import { ratioMeasures } from "./estimate.ts";
import { defaultPreference } from "./fit-preference.ts";
import { FIELDS } from "./measures.ts";

const memory = (): StorageLike & { map: Map<string, string> } => { const map = new Map<string, string>(); return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: k => { map.delete(k); } }; };
const measures = ratioMeasures(162.56, null, "punjabi");
const base = { name: "Simran", styleId: "punjabi" as const, heightCm: 162.56, kameezOverrideCm: null, preference: defaultPreference, measures, rawMeasures: null, calibration: null, confidence: Object.fromEntries(FIELDS.map(f => [f, 48])) as Record<(typeof FIELDS)[number], number>, brief: null };

test("save, list, update in place, remove", () => {
  const s = createProfileStore(memory());
  const r = s.save(base); assert.equal(r.ok, true);
  assert.equal(s.list().length, 1);
  const again = s.save({ ...base, id: r.profile!.id, name: "Simran K" });
  assert.equal(s.list().length, 1); assert.equal(s.list()[0].name, "Simran K"); assert.equal(again.profile!.id, r.profile!.id);
  assert.equal(s.remove(r.profile!.id), true); assert.deepEqual(s.list(), []);
});

test("newest first, capped at 10", () => {
  const s = createProfileStore(memory());
  for (let i = 0; i < 12; i++) s.save({ ...base, name: `P${i}` });
  assert.equal(s.list().length, 10); assert.equal(s.list()[0].name, "P11");
});

test("a profile older than six months is stale", () => {
  const s = createProfileStore(memory());
  const p = s.save(base).profile!;
  assert.equal(s.isStale(p, new Date(Date.parse(p.savedAt) + SIX_MONTHS_MS + 1000)), true);
  assert.equal(s.isStale(p, new Date(Date.parse(p.savedAt) + 1000)), false);
});

test("a throwing or missing storage never throws out", () => {
  const throwing: StorageLike = { getItem: () => { throw new Error("quota"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("quota"); } };
  const s = createProfileStore(throwing);
  assert.deepEqual(s.list(), []); assert.equal(s.save(base).ok, false); assert.equal(s.clear(), false);
  const none = createProfileStore(null);
  assert.deepEqual(none.list(), []); assert.equal(none.save(base).ok, false);
});

test("corrupt JSON under the key is treated as empty", () => {
  const m = memory(); m.setItem(PROFILE_KEY, "{not json");
  assert.deepEqual(createProfileStore(m).list(), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./device-store.ts`.

- [ ] **Step 3: Write `device-store.ts`**

```ts
import type { Field, Measures } from "./measures.ts";
import type { StyleId } from "./styles.ts";
import type { FitPreference } from "./fit-preference.ts";
import type { Calibration } from "./calibrate.ts";
import type { OrderBrief } from "../enquiries/messages.ts";

export const PROFILE_KEY = "gulmohar_fit_profile_v1";
export const MAX_PROFILES = 10;
export const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000; // app.js L31

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export interface SavedProfile {
  id: string; name: string; styleId: StyleId; heightCm: number; kameezOverrideCm: number | null; preference: FitPreference;
  measures: Measures; rawMeasures: Measures | null; calibration: Calibration | null; confidence: Record<Field, number>; brief: OrderBrief | null; savedAt: string;
}
export type ProfileInput = Omit<SavedProfile, "id" | "savedAt"> & { id?: string };

const newId = () => `fit_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Every storage access is wrapped: private mode, full quota or a missing window must never break the flow. */
export function createProfileStore(storage: StorageLike | null) {
  const read = (): SavedProfile[] => {
    try { const raw = storage?.getItem(PROFILE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };
  const write = (list: SavedProfile[]) => { try { storage?.setItem(PROFILE_KEY, JSON.stringify(list)); return !!storage; } catch { return false; } };
  return {
    list: read,
    save(input: ProfileInput): { ok: boolean; profile?: SavedProfile } {
      const list = read();
      const existing = input.id ? list.find(p => p.id === input.id) : undefined;
      const profile: SavedProfile = { ...input, id: existing?.id ?? newId(), savedAt: new Date().toISOString() };
      const next = [profile, ...list.filter(p => p.id !== profile.id)].slice(0, MAX_PROFILES);
      return write(next) ? { ok: true, profile } : { ok: false };
    },
    remove(id: string) { const list = read(); if (!list.some(p => p.id === id)) return false; return write(list.filter(p => p.id !== id)); },
    clear() { try { if (!storage) return false; storage.removeItem(PROFILE_KEY); return true; } catch { return false; } },
    isStale(p: SavedProfile, now = new Date()) { return now.getTime() - Date.parse(p.savedAt) > SIX_MONTHS_MS; },
  };
}
export type ProfileStore = ReturnType<typeof createProfileStore>;

export function browserProfileStore(): ProfileStore {
  try { return createProfileStore(typeof window === "undefined" ? null : window.localStorage); } catch { return createProfileStore(null); }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fit/device-store.ts src/lib/fit/device-store.test.ts
git commit -m "Add on-device profile storage for Find Your Fit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Pose detection in the browser and the on-device provider

**Files:**
- Create: `scripts/fetch-pose-assets.mjs`, `src/lib/fit/pose.ts`, `src/lib/fit/measure-provider.ts`, `src/lib/fit/measure-provider.test.ts`
- Modify: `package.json` (dependency, `postinstall`), `.gitignore` (`public/models/`)

**Interfaces:**
- Consumes: `Landmarks` (Task 1), `landmarkMeasures`, `ratioMeasures` (Tasks 2 and 3), `assessPoseQuality`, `PoseQuality` (Task 4), `computeConfidence` (Task 6), fixtures (Task 3).
- Produces:
  - `pose.ts`: `PoseDetector { detect(source: CanvasImageSource): Landmarks | null; close(): void }`, `loadPoseDetector(): Promise<PoseDetector>` (cached; GPU delegate, CPU fallback), `decodeImage(blob: Blob): Promise<DecodedImage>` with `DecodedImage { source: CanvasImageSource; w: number; h: number }` (downscaled to a 1600px long edge).
  - `measure-provider.ts`: `MeasureInput { front: Blob; side: Blob | null; heightCm: number; kameezOverrideCm: number | null; styleId: StyleId; force?: boolean }`, `MeasureOutcome = { ok: true; measures: Measures; confidence: Record<Field, number>; quality: PoseQuality; frontLm: Landmarks | null; sideLm: Landmarks | null } | { ok: false; reason: "pose-blocked"; quality: PoseQuality } | { ok: false; reason: "model-unavailable" }`, `MeasureProvider { measure(input: MeasureInput): Promise<MeasureOutcome> }`, `OnDeviceProvider` (constructor takes `{ loadDetector, decode }` with the real functions as defaults), `measureFromHeight(heightCm, kameezOverrideCm, styleId): { measures; confidence }`.

- [ ] **Step 1: Install the package and write the asset script**

Run: `npm install @mediapipe/tasks-vision@1.0.1`

`scripts/fetch-pose-assets.mjs`:

```js
// Self-hosts MediaPipe's WASM and the pose model under public/models so the app never loads them from a CDN at runtime.
// Runs on postinstall. A failed download warns and exits 0 so an offline install still succeeds; the UI then shows "couldn't load".
import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const wasmFrom = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const out = resolve(root, "public/models");
const modelPath = resolve(out, "pose_landmarker_lite.task");
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"; // same model as the prototype, app.js L352

await mkdir(resolve(out, "wasm"), { recursive: true });
await cp(wasmFrom, resolve(out, "wasm"), { recursive: true });

const exists = await stat(modelPath).then(() => true, () => false);
if (!exists) {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelPath, Buffer.from(await res.arrayBuffer()));
    console.log("fetch-pose-assets: model downloaded");
  } catch (error) {
    console.warn(`fetch-pose-assets: could not download the pose model (${error.message}). Run \`npm run assets:pose\` when online.`);
  }
}
```

In `package.json` add to `scripts`: `"postinstall": "node scripts/fetch-pose-assets.mjs"` and `"assets:pose": "node scripts/fetch-pose-assets.mjs"`. Add `public/models/` to `.gitignore` (after `raw-assets/`).

Run: `npm run assets:pose && ls -la public/models public/models/wasm`
Expected: `pose_landmarker_lite.task` (about 5.8 MB) and six `vision_wasm_*` files.

- [ ] **Step 2: Check the MediaPipe 1.0.1 API names before writing `pose.ts`**

Run: `grep -nE "static forVisionTasks|static createFromOptions|detect\(|minPoseDetectionConfidence|minPosePresenceConfidence|delegate\?" node_modules/@mediapipe/tasks-vision/vision.d.ts | head -20`
Expected: `FilesetResolver.forVisionTasks`, `PoseLandmarker.createFromOptions`, `detect(image, ...)` returning `PoseLandmarkerResult` with `landmarks: NormalizedLandmark[][]`, options `minPoseDetectionConfidence`, `minPosePresenceConfidence`, `baseOptions.delegate`. If any name differs, use the name from `vision.d.ts` in the next step and note it in the commit body.

- [ ] **Step 3: Write `pose.ts`**

```ts
// Browser only. The single file that touches MediaPipe. Assets come from /public/models (see scripts/fetch-pose-assets.mjs).
import type { Landmarks } from "./measures.ts";

export interface PoseDetector { detect(source: CanvasImageSource): Landmarks | null; close(): void }
export interface DecodedImage { source: CanvasImageSource; w: number; h: number }

const WASM_PATH = "/models/wasm";
const MODEL_PATH = "/models/pose_landmarker_lite.task";
const MAX_EDGE = 1600;
let pending: Promise<PoseDetector> | null = null;

// Options ported from app.js initPose (L349-362). GPU first, CPU if the GPU delegate fails to initialise.
export function loadPoseDetector(): Promise<PoseDetector> {
  if (typeof window === "undefined") return Promise.reject(new Error("pose detection runs in the browser"));
  pending ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    const create = (delegate: "GPU" | "CPU") => PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate }, runningMode: "IMAGE", numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5,
    });
    const landmarker = await create("GPU").catch(() => create("CPU"));
    return {
      detect(source) { const result = landmarker.detect(source as HTMLImageElement); return result.landmarks?.[0] ?? null; },
      close() { landmarker.close(); pending = null; },
    } satisfies PoseDetector;
  })().catch(error => { pending = null; throw error; });
  return pending;
}

/** Decodes a photo and downsizes it so detection stays quick on a phone. Nothing is kept after the caller is done. */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return { source: bitmap, w: bitmap.width, h: bitmap.height };
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { source: canvas, w: canvas.width, h: canvas.height };
}
```

- [ ] **Step 4: Write the failing provider tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { OnDeviceProvider, measureFromHeight } from "./measure-provider.ts";
import { FRONT, SIDE, IMG, HEIGHT_64_IN, makeLandmarks } from "./fixtures.ts";
import type { PoseDetector, DecodedImage } from "./pose.ts";
import type { Landmarks } from "./measures.ts";

const blob = (tag: string) => new Blob([tag]);
const fakeDeps = (byTag: Record<string, Landmarks | null>, failLoad = false) => ({
  loadDetector: async (): Promise<PoseDetector> => { if (failLoad) throw new Error("wasm blocked"); return { detect: (s) => byTag[(s as unknown as { tag: string }).tag] ?? null, close() {} }; },
  decode: async (b: Blob): Promise<DecodedImage> => ({ source: { tag: await b.text() } as unknown as CanvasImageSource, w: IMG.w, h: IMG.h }),
});
const input = { front: blob("front"), side: blob("side"), heightCm: HEIGHT_64_IN, kameezOverrideCm: null, styleId: "punjabi" as const };

test("front and side photos give a landmarks-mode draft with confidence", async () => {
  const r = await new OnDeviceProvider(fakeDeps({ front: FRONT, side: SIDE })).measure(input);
  assert.equal(r.ok, true); if (!r.ok) return;
  assert.equal(r.measures.mode, "landmarks"); assert.equal(r.measures.bust, 89.7); assert.equal(r.confidence.bust, 97); assert.equal(r.quality.ok, true);
});

test("a hard pose issue blocks unless forced", async () => {
  const arms = makeLandmarks({ NOSE: [0.5, 0.10], L_SHOULDER: [0.29, 0.25], R_SHOULDER: [0.71, 0.25], L_HIP: [0.33, 0.55], R_HIP: [0.67, 0.55], L_WRIST: [0.5, 0.45], R_WRIST: [0.78, 0.55], L_ANKLE: [0.42, 0.93], R_ANKLE: [0.58, 0.93], L_FOOT: [0.42, 0.95], R_FOOT: [0.58, 0.95] });
  const provider = new OnDeviceProvider(fakeDeps({ front: arms, side: SIDE }));
  const blocked = await provider.measure(input);
  assert.equal(blocked.ok, false); if (!blocked.ok && blocked.reason === "pose-blocked") assert.equal(blocked.quality.issues[0].code, "arms-blocking");
  const forced = await provider.measure({ ...input, force: true });
  assert.equal(forced.ok, true); if (forced.ok) assert.ok(forced.measures.warnings.some(w => /pose quality/.test(w)));
});

test("no pose in the front photo falls back to the height ratios", async () => {
  const r = await new OnDeviceProvider(fakeDeps({ front: null, side: SIDE })).measure({ ...input, force: true });
  assert.equal(r.ok, true); if (r.ok) { assert.equal(r.measures.mode, "ratio"); assert.equal(r.confidence.bust, 48); }
});

test("a model that cannot load reports model-unavailable", async () => {
  const r = await new OnDeviceProvider(fakeDeps({}, true)).measure(input);
  assert.deepEqual(r, { ok: false, reason: "model-unavailable" });
});

test("measureFromHeight is the ratio draft at capped confidence", () => {
  const r = measureFromHeight(HEIGHT_64_IN, null, "anarkali");
  assert.equal(r.measures.kameez, 94.3); assert.equal(r.confidence.kameez, 48);
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find `./measure-provider.ts`.

- [ ] **Step 6: Write `measure-provider.ts`**

Ported from `app.js` `processMeasurements` (L2008-2090) without the tailor-bias step (deferred):

```ts
import type { Field, Landmarks, Measures } from "./measures.ts";
import type { StyleId } from "./styles.ts";
import { landmarkMeasures, ratioMeasures } from "./estimate.ts";
import { assessPoseQuality, type PoseQuality } from "./retake.ts";
import { computeConfidence } from "./confidence.ts";
import { decodeImage, loadPoseDetector, type DecodedImage, type PoseDetector } from "./pose.ts";

export interface MeasureInput { front: Blob; side: Blob | null; heightCm: number; kameezOverrideCm: number | null; styleId: StyleId; force?: boolean }
export type MeasureOutcome =
  | { ok: true; measures: Measures; confidence: Record<Field, number>; quality: PoseQuality; frontLm: Landmarks | null; sideLm: Landmarks | null }
  | { ok: false; reason: "pose-blocked"; quality: PoseQuality }
  | { ok: false; reason: "model-unavailable" };

/** The seam a future vendor would implement. Release 1 has one implementation. */
export interface MeasureProvider { measure(input: MeasureInput): Promise<MeasureOutcome> }

interface Deps { loadDetector(): Promise<PoseDetector>; decode(blob: Blob): Promise<DecodedImage> }

export class OnDeviceProvider implements MeasureProvider {
  constructor(private deps: Deps = { loadDetector: loadPoseDetector, decode: decodeImage }) {}

  async measure(input: MeasureInput): Promise<MeasureOutcome> {
    let detector: PoseDetector;
    try { detector = await this.deps.loadDetector(); } catch { return { ok: false, reason: "model-unavailable" }; }
    const front = await this.deps.decode(input.front);
    const frontLm = detector.detect(front.source);
    let side: DecodedImage | null = null, sideLm: Landmarks | null = null;
    if (input.side) { side = await this.deps.decode(input.side); sideLm = detector.detect(side.source); }
    const quality = assessPoseQuality(frontLm, sideLm);
    if (quality.hard && !input.force) return { ok: false, reason: "pose-blocked", quality };
    let measures: Measures;
    if (frontLm) {
      measures = landmarkMeasures({ front: { lm: frontLm, w: front.w, h: front.h }, side: sideLm && side ? { lm: sideLm, w: side.w, h: side.h } : null, heightCm: input.heightCm, kameezOverrideCm: input.kameezOverrideCm, styleId: input.styleId });
      if (input.force && quality.hard) measures.warnings.push("Forced estimate despite pose quality issues, expect larger error.");
    } else {
      measures = ratioMeasures(input.heightCm, input.kameezOverrideCm, input.styleId);
      measures.warnings.push("No pose found in the front photo, this draft uses height only.");
    }
    const confidence = computeConfidence(measures, frontLm, sideLm, quality, false);
    return { ok: true, measures, confidence, quality, frontLm, sideLm };
  }
}

/** The "Use height only" path. Ported from the demo path, app.js L2735. */
export function measureFromHeight(heightCm: number, kameezOverrideCm: number | null, styleId: StyleId) {
  const measures = ratioMeasures(heightCm, kameezOverrideCm, styleId);
  return { measures, confidence: computeConfidence(measures, null, null, null, false) };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. Node 22 has `Blob` globally; `pose.ts` is imported for types only in the test, so it is never executed there.

Run: `npm run typecheck`
Expected: no errors. If `CanvasImageSource` is not known to `tsc`, `lib` already includes `dom`; check the cast in the test compiles.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/fetch-pose-assets.mjs src/lib/fit/pose.ts src/lib/fit/measure-provider.ts src/lib/fit/measure-provider.test.ts
git commit -m "Add browser pose detection and the on-device measure provider

Self-hosts MediaPipe WASM and the pose model under public/models on postinstall.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Fit styles, focused shell and the tape rail

**Files:**
- Modify: `src/app/tokens.css` (add `--fit-bar:56px` to `:root`)
- Create: `src/app/fit/fit.css`, `src/app/fit/layout.tsx`, `src/components/fit/tape-rail.tsx`, `src/components/fit/focus-bar.tsx`

**Interfaces:**
- Produces: `TapeRail({ current }: { current: StepId })` with `StepId = "style" | "photos" | "result"` and `STEPS: { id: StepId; label: string }[]` exported from `tape-rail.tsx`; `FocusBar({ backHref, backLabel, children })` renders `<div className="fit-focus">` with the sticky bar and children; CSS class names listed in the stylesheet below.

- [ ] **Step 1: Add the token**

In `src/app/tokens.css`, inside `:root` after `--nav-height:80px;`, add ` --fit-bar:56px;`.

- [ ] **Step 2: Write `src/app/fit/fit.css`**

Match the repo's one-rule-per-line density. Every colour is a token.

```css
/* Find Your Fit. The site header, footer and contact orbs step aside while measuring (same :has technique as the dialogs). */
body:has(.fit-focus) .site-header,body:has(.fit-focus) .site-footer,body:has(.fit-focus) .floating-contacts{display:none}
.fit-focus{min-height:100dvh;display:flex;flex-direction:column;background:var(--paper)}
.focus-bar{position:sticky;top:0;z-index:30;background:var(--paper-light);border-bottom:1px solid var(--line)}
.focus-bar-inner{height:var(--fit-bar);max-width:var(--page-max);margin:auto;padding-inline:var(--gutter);display:flex;align-items:center;justify-content:space-between;gap:16px}
.focus-back{display:inline-flex;align-items:center;gap:10px;min-height:var(--target);font-size:var(--text-label)}.focus-back:hover{color:var(--flame)}
/* The tape rail: fine ticks every 8px, a taller tick every 40px, progress in flame. */
.tape-rail{position:relative;height:18px;background:repeating-linear-gradient(to right,var(--line) 0 1px,transparent 1px 8px) left bottom/100% 8px no-repeat,repeating-linear-gradient(to right,var(--line) 0 1px,transparent 1px 40px) left bottom/100% 14px no-repeat}
.tape-progress{position:absolute;top:0;bottom:0;left:0;background:repeating-linear-gradient(to right,var(--flame) 0 1px,transparent 1px 8px) left bottom/100% 8px no-repeat,repeating-linear-gradient(to right,var(--flame) 0 1px,transparent 1px 40px) left bottom/100% 14px no-repeat;transition:width var(--duration) var(--ease)}
.tape-steps{display:grid;grid-template-columns:repeat(3,1fr);max-width:var(--page-max);margin:auto;padding:10px var(--gutter) 0;list-style:none;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.tape-steps li{display:flex;gap:8px;align-items:baseline}.tape-steps li[data-done=true]{color:var(--ink)}.tape-steps li[aria-current=step]{color:var(--flame)}
.tape-steps li:nth-child(2){justify-content:center}.tape-steps li:last-child{justify-content:flex-end}
/* Step content */
.fit-step{width:100%;max-width:720px;margin:0 auto;padding:32px var(--gutter) 40px;display:grid;gap:24px;align-content:start;flex:1}
.fit-step h1{font-size:clamp(32px,5vw,44px)}.fit-lede{font-size:15px;color:var(--muted);max-width:52ch}
.fit-field{display:grid;gap:8px;font-size:13px}.fit-field-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}
.unit-toggle{display:flex}.unit-toggle .chip{min-width:52px;justify-content:center;display:inline-flex;align-items:center}
.fit-error{border-left:2px solid var(--flame);padding:6px 12px;font-size:13px}.fit-note{font-size:12px;color:var(--muted);line-height:1.7}
.fit-actions{position:sticky;bottom:0;background:var(--paper);border-top:1px solid var(--line);padding:16px 0 calc(16px + env(safe-area-inset-bottom));display:grid;gap:12px}.fit-actions .button{width:100%}
/* Style cards */
.style-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.style-card{display:grid;gap:10px;padding:16px 14px 18px;background:var(--paper-light);border:2px solid transparent;text-align:left;color:var(--ink);min-height:var(--target)}
.style-card svg{width:100%;height:auto;color:var(--ink)}.style-card[aria-pressed=true]{border-color:var(--oxblood)}
.style-card strong{font:400 21px/1.2 var(--font-display),serif}.style-card small{font-size:12px;color:var(--muted)}
/* Camera */
.capture{flex:1;display:grid;grid-template-rows:1fr auto auto;background:var(--oxblood-deep);color:var(--on-dark);min-height:calc(100dvh - var(--fit-bar) - 60px)}
.capture-stage{position:relative;overflow:hidden;min-height:50dvh}.capture-stage video,.capture-stage img{width:100%;height:100%;object-fit:contain;display:block;background:var(--oxblood-deep)}
.capture-guide{position:absolute;inset:0;width:100%;height:100%;color:var(--on-dark);opacity:.45;pointer-events:none}
.capture-tips{padding:12px var(--gutter);font-size:13px;display:grid;gap:6px;background:var(--film-control-bg)}.capture-tips strong{font-weight:500}
.capture-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px var(--gutter) calc(16px + env(safe-area-inset-bottom))}
.capture-actions .button-outline{color:var(--on-dark);border-color:var(--line-light)}.capture-actions .button-outline:hover{background:var(--oxblood)}
.capture :focus-visible{outline-color:var(--on-dark)}.capture-file{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}
.capture-shots{display:flex;gap:12px;padding:0 var(--gutter) 12px}.capture-shots figure{width:56px}.capture-shots img{aspect-ratio:3/4;object-fit:cover;width:100%}.capture-shots figcaption{font-size:10px;letter-spacing:.08em;padding-top:4px}
/* Ledger */
.draft-eyebrow{color:var(--flame)}
.ledger{border-top:1px solid var(--line);margin:0}.ledger-group{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--flame);padding:24px 0 8px}
.ledger-row{display:grid;grid-template-columns:1fr auto;gap:4px 16px;padding:14px 0 12px;border-bottom:1px solid var(--line)}
.ledger-row dt{font-size:13px;align-self:end}.ledger-row dt small{display:block;font-size:11px;color:var(--muted);margin-top:4px}
.ledger-row dd{margin:0;text-align:right}.ledger-in{font:400 28px/1 var(--font-display),serif;font-variant-numeric:tabular-nums}
.ledger-in small{font:500 11px/1 var(--font-body),sans-serif;letter-spacing:.08em;margin-left:4px}.ledger-cm{display:block;font-size:12px;color:var(--muted);margin-top:4px}
.conf{grid-column:1/-1;display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;font-size:11px;color:var(--muted)}
.conf-bar{height:2px;background:var(--paper-deep)}.conf-bar span{display:block;height:100%;background:var(--line)}
.conf[data-level=high] .conf-bar span{background:var(--flame)}.conf[data-level=mid] .conf-bar span{background:var(--ink)}
/* Panels on the result step */
.fit-panel{background:var(--paper-light);padding:20px;display:grid;gap:16px}.fit-panel h2{font-size:24px}.fit-panel .chips{gap:8px}
.fit-summary{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:13px;color:var(--muted)}
.fit-warnings{display:grid;gap:6px;font-size:12px;color:var(--muted);padding-left:16px}
/* Profile list */
.profile-list{display:grid;gap:12px}.profile-card{display:grid;gap:8px;padding:16px;background:var(--paper-light)}
.profile-card strong{font:400 21px/1.2 var(--font-display),serif}.profile-card .fit-summary{font-size:12px}.profile-card-actions{display:flex;flex-wrap:wrap;gap:8px}
@media(min-width:768px){.style-grid{grid-template-columns:repeat(4,1fr)}.fit-step{padding-top:48px}.capture{min-height:0}.capture-stage{min-height:60vh}.fit-actions{position:static;border:0;padding:8px 0 0;grid-auto-flow:column;justify-content:start}.fit-actions .button{width:auto}}
```

- [ ] **Step 3: Write the fit layout**

`src/app/fit/layout.tsx`:

```tsx
import type {Metadata} from 'next';
import './fit.css';
export const metadata:Metadata={title:'Find your fit',description:'Draft Punjabi suit measurements from two photos and your height, checked by our tailor before cutting.'};
export default function FitLayout({children}:{children:React.ReactNode}){return children;}
```

- [ ] **Step 4: Write `tape-rail.tsx`**

```tsx
export type StepId = 'style' | 'photos' | 'result';
export const STEPS: {id: StepId; label: string}[] = [{id: 'style', label: 'Style'}, {id: 'photos', label: 'Photos'}, {id: 'result', label: 'Your fit'}];

/** A tailor's tape as the progress indicator. Progress fills to the start of the current step, fully at the result. */
export function TapeRail({current}: {current: StepId}) {
  const index = STEPS.findIndex(s => s.id === current);
  const width = index === STEPS.length - 1 ? 100 : (index / (STEPS.length - 1)) * 100;
  return <nav aria-label="Progress">
    <div className="tape-rail" aria-hidden="true"><div className="tape-progress" style={{width: `${width}%`}}/></div>
    <ol className="tape-steps">{STEPS.map((s, i) => <li key={s.id} aria-current={s.id === current ? 'step' : undefined} data-done={i < index}><span className="eyebrow">0{i + 1}</span>{s.label}</li>)}</ol>
  </nav>;
}
```

- [ ] **Step 5: Write `focus-bar.tsx`**

```tsx
import Link from 'next/link';
import {BrandMark} from '../brand-mark';

/** The focused shell: a slim bar with a way back and the lockup. Hides the site chrome via body:has(.fit-focus). */
export function FocusBar({backHref, backLabel, children}: {backHref: string; backLabel: string; children: React.ReactNode}) {
  return <div className="fit-focus">
    <header className="focus-bar"><div className="focus-bar-inner"><Link className="focus-back" href={backHref}>← {backLabel}</Link><Link href="/" aria-label="Gulmohar Wears home"><BrandMark compact eager/></Link></div></header>
    {children}
  </div>;
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck && npm run lint`
Expected: clean (the components are not rendered yet, that comes in Task 12).

```bash
git add src/app/tokens.css src/app/fit/fit.css src/app/fit/layout.tsx src/components/fit/tape-rail.tsx src/components/fit/focus-bar.tsx
git commit -m "Add the Find Your Fit shell styles and tape rail

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Intro page and site links

**Files:**
- Create: `src/app/fit/page.tsx`
- Modify: `src/components/navigation.tsx:12` (`links`), `src/components/footer.tsx` ("HELP WITH YOUR ORDER" column)

**Interfaces:**
- Consumes: `.page-heading`, `.process-list`, `.button`, `.text-link`, `details/summary` styles from `globals.css`; `Arrow` from `icons.tsx`; `whatsappUrl`.
- Produces: route `/fit`.

- [ ] **Step 1: Write the intro page**

Copy is from spec section 5, humanized, no dashes. The three steps are a real sequence, so the numbered `.process-list` is justified.

```tsx
import Link from 'next/link';
import {Arrow} from '@/components/icons';
import {whatsappUrl} from '@/lib/enquiries/messages';

export default function FitIntro(){return <main id="main" className="page-width">
  <div className="page-heading"><p className="eyebrow">FIND YOUR FIT</p><h1>Find your <em>Gulmohar fit.</em></h1><p>Two photos and your height give us a draft of your measurements. One tape measurement makes them closer. Our tailor checks every number before cutting fabric.</p><Link className="button button-primary" href="/fit/measure">Start my fit <Arrow/></Link></div>
  <section className="personal-process" aria-labelledby="fit-how"><div className="process-heading"><p className="eyebrow">HOW IT WORKS</p><h2 id="fit-how">Three steps, about five minutes.</h2><p>Everything happens on your phone. Your photos and your sizes stay on this device until you choose to send them to us on WhatsApp.</p></div>
  <ol className="process-list">
    <li><span className="eyebrow">01</span><div><h3>Measure</h3><p>Pick your silhouette, enter your height, then take a front and a side photo in fitted clothes against a plain wall.</p></div></li>
    <li><span className="eyebrow">02</span><div><h3>Correct with one tape</h3><p>Measure your bust or waist once with a tape. Every other girth adjusts to it.</p></div></li>
    <li><span className="eyebrow">03</span><div><h3>Our tailor verifies</h3><p>Send the draft to us on WhatsApp. We confirm the numbers with you before anything is cut.</p></div></li>
  </ol></section>
  <section className="page-width" style={{maxWidth: 720, paddingBottom: 'var(--chapter)'}}>
    <details><summary>How accurate is this?</summary><p>Your photos give us a starting point, not a final cut. Measurements from photos can be off by an inch or two, sometimes more. One tape measurement of your bust or waist brings them much closer. Our tailor checks every number before cutting fabric.</p></details>
    <details><summary>What happens to my photos?</summary><p>They are read on your phone and never uploaded. Nothing is stored unless you tap Save to this phone, and even then it stays in this browser only.</p></details>
    <p className="fit-note" style={{marginTop: 24}}>Prefer to talk first? <a className="text-link" href={whatsappUrl('Hi Gulmohar, I would like help with my measurements.')} target="_blank" rel="noopener noreferrer">Message us on WhatsApp <Arrow diagonal/></a></p>
  </section>
</main>;}
```

If `style` props feel out of place next to the repo's class-only styling, add `.fit-intro-details{max-width:720px;padding-bottom:var(--chapter)}` and `.fit-intro-details>p{margin-top:24px}` to `fit.css` and use those classes instead.

- [ ] **Step 2: Add the navigation and footer links**

In `navigation.tsx` line 12 change `links` to:

```ts
const links = [['Collections', '/collections'], ['Find your fit', '/fit'], ['Custom orders', '/custom'], ['Our atelier', '/atelier'], ['Journal', '/journal']];
```

The mobile menu numbers entries `0{i + 1}`; five entries still fit. In `footer.tsx`, in the "HELP WITH YOUR ORDER" column, add `<Link href="/fit">Find your fit</Link>` before `<Link href="/size-and-fit">`.

- [ ] **Step 3: Check in the browser**

Run `npm run dev`, open `http://localhost:3001/fit` at 390px and 1440px. Expected: one `h1`, the three steps, both disclosures open and close, the primary button goes to `/fit/measure` (404 until Task 12). The desktop nav shows "Find your fit" between Collections and Custom orders without wrapping at 1100px; if it wraps, shorten the label to "Your fit" in the desktop list only.

- [ ] **Step 4: Commit**

```bash
git add src/app/fit/page.tsx src/components/navigation.tsx src/components/footer.tsx src/app/fit/fit.css
git commit -m "Add the Find Your Fit intro page and site links

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: The measure route, flow state and the style step

**Files:**
- Create: `src/components/fit/flow-types.ts`, `src/components/fit/style-art.tsx`, `src/components/fit/style-picker.tsx`, `src/components/fit/height-field.tsx`, `src/components/fit/step-style.tsx`, `src/components/fit/measure-flow.tsx`, `src/app/fit/measure/page.tsx`

The spec names `public/fit/styles/*.svg`; this plan inlines the four drawings as components so the stroke follows `currentColor`. Same intent (line drawings, no generated garments).

**Interfaces:**
- Consumes: `STYLES`, `StyleId` (Task 2), `inToCm`, `cmToIn` (Task 1), `TapeRail`, `StepId`, `FocusBar` (Task 10), `FitPreference`, `defaultPreference` (Task 5), `Measures`, `Field`, `Landmarks` (Task 1), `Calibration` (Task 5), `PoseQuality` (Task 4), `OrderBrief` (Task 7).
- Produces:
  - `flow-types.ts`: `Draft { measures: Measures; raw: Measures; confidence: Record<Field, number>; calibration: Calibration | null; frontLm: Landmarks | null; sideLm: Landmarks | null; quality: PoseQuality | null }`, `FlowState { name; styleId; heightCm: number | null; kameezOverrideCm: number | null; front: Blob | null; side: Blob | null; attempts: number; draft: Draft | null; preference: FitPreference; brief: OrderBrief; profileId: string | null }`, `initialFlow`, `StepProps { state: FlowState; update(patch: Partial<FlowState>): void }`.
  - `StyleArt({id})`, `StylePicker({value, onChange})`, `HeightField({valueCm, onChange})`, `StepStyle(props: StepProps & { onNext(): void })`, `MeasureFlow()`.
  - Route `/fit/measure?step=style|photos|result`.

- [ ] **Step 1: Write `flow-types.ts`**

```ts
import type {StyleId} from '@/lib/fit/styles';
import type {Field, Landmarks, Measures} from '@/lib/fit/measures';
import type {Calibration} from '@/lib/fit/calibrate';
import type {PoseQuality} from '@/lib/fit/retake';
import {defaultPreference, type FitPreference} from '@/lib/fit/fit-preference';
import type {OrderBrief} from '@/lib/enquiries/messages';

export interface Draft {measures: Measures; raw: Measures; confidence: Record<Field, number>; calibration: Calibration | null; frontLm: Landmarks | null; sideLm: Landmarks | null; quality: PoseQuality | null}
export interface FlowState {name: string; styleId: StyleId; heightCm: number | null; kameezOverrideCm: number | null; front: Blob | null; side: Blob | null; attempts: number; draft: Draft | null; preference: FitPreference; brief: OrderBrief; profileId: string | null}
export const emptyBrief: OrderBrief = {fabric: '', occasion: '', city: '', deadline: '', notes: ''};
export const initialFlow: FlowState = {name: '', styleId: 'punjabi', heightCm: null, kameezOverrideCm: null, front: null, side: null, attempts: 0, draft: null, preference: defaultPreference, brief: emptyBrief, profileId: null};
export interface StepProps {state: FlowState; update(patch: Partial<FlowState>): void}
```

- [ ] **Step 2: Write `style-art.tsx`**

Four diagrams, not garments. `viewBox 0 0 90 120`, stroke `currentColor`, no fill.

```tsx
import type {StyleId} from '@/lib/fit/styles';

const common = {viewBox: '0 0 90 120', fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true} as const;
const head = <><circle cx="45" cy="12" r="7"/><path d="M45 19v5"/></>;

const ART: Record<StyleId, React.ReactNode> = {
  punjabi: <>{head}<path d="M30 24h30l6 46H24z"/><path d="M30 24l-12 4 3 30M60 24l12 4-3 30"/><path d="M28 70l-4 42h16l5-32 5 32h16l-4-42"/><path d="M31 27q14 22 31 41"/></>,
  anarkali: <>{head}<path d="M33 24h24l2 22H31z"/><path d="M31 46L15 112h60L59 46"/><path d="M33 24l-13 4 3 24M57 24l13 4-3 24"/><path d="M36 112v6M54 112v6"/></>,
  sharara: <>{head}<path d="M30 24h30l4 38H26z"/><path d="M30 24l-12 4 3 26M60 24l12 4-3 26"/><path d="M26 62L11 118h33l1-48 1 48h33L64 62"/></>,
  farshi: <>{head}<path d="M30 24h30l5 56H25z"/><path d="M30 24l-12 4 3 30M60 24l12 4-3 30"/><path d="M25 80L13 118h64L65 80"/><path d="M6 118h78"/></>,
};

export function StyleArt({id}: {id: StyleId}) {return <svg {...common}>{ART[id]}</svg>;}
```

- [ ] **Step 3: Write `style-picker.tsx` and `height-field.tsx`**

```tsx
'use client';
import {STYLES, type StyleId} from '@/lib/fit/styles';
import {StyleArt} from './style-art';

export function StylePicker({value, onChange}: {value: StyleId; onChange(id: StyleId): void}) {
  return <fieldset><legend>Suit style <span aria-hidden="true">*</span></legend>
    <div className="style-grid">{STYLES.map(s => <button key={s.id} type="button" className="style-card" aria-pressed={value === s.id} onClick={() => onChange(s.id)}><StyleArt id={s.id}/><strong>{s.label}</strong><small>{s.note}</small></button>)}</div>
  </fieldset>;
}
```

```tsx
'use client';
import {useState} from 'react';
import {cmToIn, inToCm} from '@/lib/fit/units';

const MIN_IN = 47, MAX_IN = 87; // app.js L2724-2730
type Unit = 'in' | 'cm';

/** Height in inches by default, cm on request. Reports cm or null; shows the range error beside the field. */
export function HeightField({valueCm, onChange}: {valueCm: number | null; onChange(cm: number | null): void}) {
  const [unit, setUnit] = useState<Unit>('in');
  const [text, setText] = useState(valueCm ? String(Math.round(cmToIn(valueCm))) : '');
  const [error, setError] = useState<string | null>(null);
  const toCm = (raw: string, u: Unit) => { const n = Number(raw.replace(',', '.')); if (!raw.trim() || !Number.isFinite(n)) return null; const inches = u === 'in' ? n : cmToIn(n); return inches >= MIN_IN && inches <= MAX_IN ? inToCm(inches) : Number.NaN; };
  const commit = (raw: string, u: Unit) => { const cm = toCm(raw, u); if (cm === null || Number.isNaN(cm)) { setError(u === 'in' ? `Height is usually between ${MIN_IN} and ${MAX_IN} in. Check the number.` : 'Height is usually between 119 and 221 cm. Check the number.'); onChange(null); } else { setError(null); onChange(cm); } };
  const switchUnit = (u: Unit) => { if (u === unit) return; const cm = toCm(text, unit); setUnit(u); setError(null); if (cm && !Number.isNaN(cm)) { const next = u === 'in' ? String(Math.round(cmToIn(cm))) : String(Math.round(cm)); setText(next); onChange(cm); } };
  return <div className="fit-field">
    <label htmlFor="height">Height <span aria-hidden="true">*</span></label>
    <div className="fit-field-row">
      <input id="height" name="height" inputMode="decimal" required autoComplete="off" placeholder={unit === 'in' ? 'For example, 64' : 'For example, 163'} value={text} aria-describedby="height-hint height-error" aria-invalid={error ? true : undefined} onChange={e => setText(e.target.value)} onBlur={e => commit(e.target.value, unit)}/>
      <div className="unit-toggle" role="group" aria-label="Height unit"><button type="button" className="chip" aria-pressed={unit === 'in'} onClick={() => switchUnit('in')}>in</button><button type="button" className="chip" aria-pressed={unit === 'cm'} onClick={() => switchUnit('cm')}>cm</button></div>
    </div>
    <span id="height-hint" className="fit-note">Stand straight without shoes. Every photo measurement is scaled from this, so it must be right.</span>
    <p id="height-error" className="fit-error" role="alert" hidden={!error}>{error}</p>
  </div>;
}
```

- [ ] **Step 4: Write `step-style.tsx`**

```tsx
'use client';
import {useState, type FormEvent} from 'react';
import {Arrow} from '../icons';
import {StylePicker} from './style-picker';
import {HeightField} from './height-field';
import {inToCm} from '@/lib/fit/units';
import {getStyle} from '@/lib/fit/styles';
import type {StepProps} from './flow-types';

export function StepStyle({state, update, onNext}: StepProps & {onNext(): void}) {
  const [error, setError] = useState<string | null>(null);
  const style = getStyle(state.styleId);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.heightCm) { setError('Enter your height first. The photos are scaled from it.'); (document.getElementById('height') as HTMLInputElement | null)?.focus(); return; }
    setError(null); onNext();
  }
  return <main id="main" className="fit-step"><form className="fit-step" style={{padding: 0}} onSubmit={submit} noValidate>
    <div><h1>Choose your silhouette</h1><p className="fit-lede">Pick the style you have in mind, then your height. Every estimate is scaled from it.</p></div>
    <StylePicker value={state.styleId} onChange={id => update({styleId: id})}/>
    <p className="fit-note">{style.note}. {style.id === 'punjabi' ? 'Kameez to mid thigh, about 45% of your height.' : `Kameez about ${Math.round(style.kameezRatio * 100)}% of your height unless you set a length below.`}</p>
    <div className="fit-field"><label htmlFor="name">Your name <span className="optional">Optional</span></label><input id="name" name="name" autoComplete="given-name" maxLength={80} placeholder="For example, Simran" value={state.name} onChange={e => update({name: e.target.value})}/></div>
    <HeightField valueCm={state.heightCm} onChange={cm => update({heightCm: cm})}/>
    <div className="fit-field"><label htmlFor="kameez">Kameez length you like <span className="optional">Optional, inches</span></label><input id="kameez" name="kameez" inputMode="decimal" placeholder="Leave blank for the usual length" value={state.kameezOverrideCm ? String(Math.round(state.kameezOverrideCm / 2.54)) : ''} onChange={e => { const n = Number(e.target.value); update({kameezOverrideCm: Number.isFinite(n) && n >= 20 && n <= 63 ? inToCm(n) : null}); }}/><span className="fit-note">Measured from the shoulder down. 20 to 63 in.</span></div>
    <p className="fit-error" role="alert" hidden={!error}>{error}</p>
    <div className="fit-actions"><button className="button button-primary" type="submit">Next: Photos <Arrow/></button></div>
  </form></main>;
}
```

If the nested `.fit-step` padding override reads badly, add `.fit-form{display:grid;gap:24px}` to `fit.css` and use it on the form instead.

- [ ] **Step 5: Write `measure-flow.tsx` with the other two steps stubbed**

```tsx
'use client';
import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {TapeRail, STEPS, type StepId} from './tape-rail';
import {StepStyle} from './step-style';
import {initialFlow, type FlowState} from './flow-types';

const isStep = (s: string | null): s is StepId => STEPS.some(step => step.id === s);

/** Owns the flow state in memory. Photos never go anywhere; a reload clears them on purpose. */
export function MeasureFlow() {
  const params = useSearchParams(); const router = useRouter();
  const [state, setState] = useState<FlowState>(initialFlow);
  const requested: StepId = isStep(params.get('step')) ? (params.get('step') as StepId) : 'style';
  // A step cannot show without its inputs: results need a draft, photos need a height.
  const step: StepId = requested === 'result' && !state.draft ? (state.heightCm ? 'photos' : 'style') : requested === 'photos' && !state.heightCm ? 'style' : requested;
  useEffect(() => { if (step !== requested) router.replace(`/fit/measure?step=${step}`); }, [step, requested, router]);
  const go = (s: StepId) => router.push(`/fit/measure?step=${s}`);
  const update = (patch: Partial<FlowState>) => setState(s => ({...s, ...patch}));
  return <>
    <TapeRail current={step}/>
    {step === 'style' && <StepStyle state={state} update={update} onNext={() => go('photos')}/>}
    {step === 'photos' && <main id="main" className="fit-step"><h1>Photos</h1><p className="fit-lede">Coming in Task 13.</p></main>}
    {step === 'result' && <main id="main" className="fit-step"><h1>Your draft fit</h1><p className="fit-lede">Coming in Task 14.</p></main>}
  </>;
}
```

- [ ] **Step 6: Write the page**

`src/app/fit/measure/page.tsx`:

```tsx
import {Suspense} from 'react';
import {FocusBar} from '@/components/fit/focus-bar';
import {MeasureFlow} from '@/components/fit/measure-flow';

export default function Measure(){return <FocusBar backHref="/fit" backLabel="Back"><Suspense fallback={<main id="main" className="fit-step"><h1>Find your fit</h1></main>}><MeasureFlow/></Suspense></FocusBar>;}
```

`useSearchParams` needs the Suspense boundary for prerendering (see `03-layouts-and-pages.md`, "Rendering with search params").

- [ ] **Step 7: Check in the browser**

Run `npm run dev`. Open `/fit/measure` at 390px: the site header and orbs are gone, the slim bar shows "← Back" and the lockup, the tape rail shows no flame, "01 Style" is flame. Tap a card: 2px oxblood border. Type `640` in height and blur: error appears under the field. Type `64`, submit: URL becomes `?step=photos`, rail fills to the middle tick. Browser back returns to the style step with the card still selected. Reload on `?step=photos` redirects to `?step=style` (state is memory only).

Run: `npm run typecheck && npm run lint`

- [ ] **Step 8: Commit**

```bash
git add src/components/fit src/app/fit/measure/page.tsx
git commit -m "Add the measure flow with the style and height step

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Camera capture, retake tips and measuring

**Files:**
- Create: `src/components/fit/camera-capture.tsx`, `src/components/fit/pose-tips.tsx`, `src/components/fit/step-photos.tsx`
- Modify: `src/components/fit/measure-flow.tsx` (replace the photos stub)

**Interfaces:**
- Consumes: `OnDeviceProvider`, `measureFromHeight`, `MeasureOutcome` (Task 9), `loadPoseDetector` (Task 9), `IssueCode`, `PoseIssue` (Task 4), `StepProps`, `Draft` (Task 12).
- Produces: `CameraCapture({shot, onCapture}: {shot: 'front' | 'side'; onCapture(blob: Blob): void})`, `TIPS: Record<IssueCode, string>`, `PoseTips({issues}: {issues: PoseIssue[]})`, `StepPhotos(props: StepProps & {onBack(): void; onDone(): void})`.

- [ ] **Step 1: Write `pose-tips.tsx`** (customer wording for the codes from Task 4; no dashes)

```tsx
import type {IssueCode, PoseIssue} from '@/lib/fit/retake';

export const TIPS: Record<IssueCode, string> = {
  'no-front': "We couldn't find a person in the front photo. Try a plain background and even light.",
  'too-small': 'Stand farther back so your whole body, head to feet, fills the frame.',
  'feet-cropped': 'Your feet are cut off. Step back or tilt the phone down so both feet show.',
  'head-low': 'Your head sits low in the frame. Move back or lower the phone a little.',
  'arms-blocking': "Your arms are covering your waist. Hold them a hand's width away from your body.",
  'shoulders-unclear': "We couldn't see your shoulders clearly. Face the camera in fitted clothes and even light.",
  'side-frontal': 'The side photo looks like a front view. Turn fully to one side.',
  'side-feet': 'Side photo: your feet are cut off. Stand at the same distance as for the front photo.',
  'no-side': 'Without a side photo, bust, waist and hip are less certain.',
};

export function PoseTips({issues}: {issues: PoseIssue[]}) {
  if (!issues.length) return null;
  return <ul className="fit-warnings" role="alert">{issues.map(i => <li key={i.code}><strong>{i.hard ? 'Retake: ' : 'Tip: '}</strong>{TIPS[i.code]}</li>)}</ul>;
}
```

- [ ] **Step 2: Write `camera-capture.tsx`**

Rear camera first (someone is usually helping), switchable. Front-camera frames are mirrored on capture like the prototype (app.js L2831). Upload is always available and becomes the only option when the camera is denied.

```tsx
'use client';
import {useEffect, useRef, useState} from 'react';
import {Arrow} from '../icons';

type Facing = 'environment' | 'user';
const FRAMING: Record<'front' | 'side', string[]> = {
  front: ['Face the camera, arms a little away from your body.', 'Whole body in frame, head to feet.', 'Fitted clothes, plain wall, even light.'],
  side: ['Turn fully to one side.', 'Same distance from the camera as the front photo.', 'Arms relaxed by your sides.'],
};

/** Live preview with an outline guide, capture to JPEG, upload fallback. Streams stop on unmount. */
export function CameraCapture({shot, onCapture}: {shot: 'front' | 'side'; onCapture(blob: Blob): void}) {
  const video = useRef<HTMLVideoElement>(null); const file = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [camera, setCamera] = useState<'starting' | 'live' | 'unavailable'>('starting');
  const [preview, setPreview] = useState<{url: string; blob: Blob} | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined; let cancelled = false;
    if (preview) return;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera api');
        stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: facing}, width: {ideal: 1280}, height: {ideal: 1920}}, audio: false});
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        setCamera('live');
      } catch { setCamera('unavailable'); }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [facing, preview]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  function capture() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas'); canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d')!;
    if (facing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(blob => { if (blob) setPreview({url: URL.createObjectURL(blob), blob}); }, 'image/jpeg', 0.92);
  }
  function chooseFile(f: File | undefined) { if (f) setPreview({url: URL.createObjectURL(f), blob: f}); }

  return <section className="capture" aria-label={`${shot === 'front' ? 'Front' : 'Side'} photo`}>
    <div className="capture-stage">
      {preview ? <img src={preview.url} alt={`Your ${shot} photo, ready to check`}/> : <video ref={video} playsInline muted aria-label="Camera preview"/>}
      {!preview && camera === 'live' && <svg className="capture-guide" viewBox="0 0 90 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3"><circle cx="45" cy="18" r="9"/><path d="M22 40h46M45 40v70M18 150h54"/></svg>}
      {!preview && camera === 'unavailable' && <div className="capture-tips" style={{position: 'absolute', inset: 'auto 0 0 0'}}><strong>Camera not available.</strong> Upload a photo from your gallery instead.</div>}
    </div>
    <div className="capture-tips">{preview ? <strong>Whole body in frame, feet showing, arms away from the body?</strong> : FRAMING[shot].map(t => <span key={t}>{t}</span>)}</div>
    <div className="capture-actions">
      {preview ? <>
        <button type="button" className="button button-outline" onClick={() => setPreview(null)}>Retake</button>
        <button type="button" className="button button-primary" onClick={() => onCapture(preview.blob)}>Use this photo <Arrow/></button>
      </> : <>
        <button type="button" className="button button-outline" onClick={() => file.current?.click()}>Upload instead</button>
        <button type="button" className="button button-primary" onClick={capture} disabled={camera !== 'live'}>Take photo</button>
        {camera === 'live' && <button type="button" className="text-link" style={{gridColumn: '1 / -1', color: 'inherit'}} onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}>Switch camera</button>}
      </>}
      <input ref={file} className="capture-file" type="file" accept="image/*" aria-label="Upload a photo" onChange={e => chooseFile(e.target.files?.[0])}/>
    </div>
  </section>;
}
```

- [ ] **Step 3: Write `step-photos.tsx`**

```tsx
'use client';
import {useEffect, useMemo, useState} from 'react';
import {Arrow} from '../icons';
import {CameraCapture} from './camera-capture';
import {PoseTips} from './pose-tips';
import {OnDeviceProvider, measureFromHeight, type MeasureOutcome} from '@/lib/fit/measure-provider';
import {loadPoseDetector} from '@/lib/fit/pose';
import type {StepProps} from './flow-types';

type Phase = 'front' | 'side' | 'measuring' | 'blocked' | 'unavailable';

export function StepPhotos({state, update, onBack, onDone}: StepProps & {onBack(): void; onDone(): void}) {
  const provider = useMemo(() => new OnDeviceProvider(), []);
  const [phase, setPhase] = useState<Phase>(state.front ? 'side' : 'front');
  const [blocked, setBlocked] = useState<Extract<MeasureOutcome, {reason: 'pose-blocked'}> | null>(null);
  useEffect(() => { loadPoseDetector().catch(() => {}); }, []); // warm the model while the customer frames the shot

  async function measure(front: Blob, side: Blob | null, force = false) {
    if (!state.heightCm) { onBack(); return; }
    setPhase('measuring');
    const outcome = await provider.measure({front, side, heightCm: state.heightCm, kameezOverrideCm: state.kameezOverrideCm, styleId: state.styleId, force});
    if (outcome.ok) { update({draft: {measures: outcome.measures, raw: outcome.measures, confidence: outcome.confidence, calibration: null, frontLm: outcome.frontLm, sideLm: outcome.sideLm, quality: outcome.quality}}); onDone(); return; }
    if (outcome.reason === 'model-unavailable') { setPhase('unavailable'); return; }
    setBlocked(outcome); update({attempts: state.attempts + 1}); setPhase('blocked');
  }
  function heightOnly() {
    if (!state.heightCm) return;
    const r = measureFromHeight(state.heightCm, state.kameezOverrideCm, state.styleId);
    update({draft: {measures: r.measures, raw: r.measures, confidence: r.confidence, calibration: null, frontLm: null, sideLm: null, quality: null}}); onDone();
  }

  if (phase === 'front') return <main id="main" className="fit-step" style={{padding: 0, maxWidth: 'none'}}><h1 className="eyebrow" style={{padding: '12px var(--gutter) 0'}}>FRONT PHOTO</h1><CameraCapture shot="front" onCapture={blob => { update({front: blob}); setPhase('side'); }}/></main>;
  if (phase === 'side') return <main id="main" className="fit-step" style={{padding: 0, maxWidth: 'none'}}><h1 className="eyebrow" style={{padding: '12px var(--gutter) 0'}}>SIDE PHOTO</h1><CameraCapture shot="side" onCapture={blob => { update({side: blob}); measure(state.front!, blob); }}/></main>;
  if (phase === 'measuring') return <main id="main" className="fit-step"><h1>Measuring</h1><p className="fit-lede" aria-live="polite">Reading your pose on this phone. This takes a few seconds and nothing is uploaded.</p></main>;
  if (phase === 'unavailable') return <main id="main" className="fit-step"><h1>We couldn't load the measuring tool</h1><p className="fit-lede">Your browser blocked it or the connection dropped. You can try again, or continue with a height-only draft, which is less precise.</p><div className="fit-actions"><button className="button button-primary" type="button" onClick={() => measure(state.front!, state.side)}>Try again</button><button className="button button-outline" type="button" onClick={heightOnly}>Use height only</button></div></main>;
  return <main id="main" className="fit-step">
    <h1>Let's retake that</h1><p className="fit-lede">We couldn't read your pose well enough for a draft.</p>
    {blocked && <PoseTips issues={blocked.quality.issues}/>}
    <div className="fit-actions">
      <button className="button button-primary" type="button" onClick={() => { update({front: null, side: null}); setPhase('front'); }}>Retake photos <Arrow/></button>
      {state.attempts >= 2 && <button className="button button-outline" type="button" onClick={() => measure(state.front!, state.side, true)}>Use these anyway (weaker draft)</button>}
    </div>
  </main>;
}
```

Replace the inline `style` props with classes in `fit.css` if preferred: `.fit-step-capture{padding:0;max-width:none}` and `.capture-heading{padding:12px var(--gutter) 0}`.

- [ ] **Step 4: Wire it into `measure-flow.tsx`**

Replace the photos stub with:

```tsx
{step === 'photos' && <StepPhotos state={state} update={update} onBack={() => go('style')} onDone={() => go('result')}/>}
```

and import `StepPhotos`.

- [ ] **Step 5: Check on a real phone**

Run `npm run dev -- --hostname 0.0.0.0` and open `http://<your-mac-ip>:3001/fit/measure` on a phone on the same Wi-Fi (camera needs HTTPS or localhost; if the phone refuses, use `npx vercel dev` or deploy a preview in Task 15 and test there). Expected: camera preview with the dotted guide, "Take photo" captures and shows the preview, "Use this photo" moves to the side shot, then "Measuring" and on to `?step=result` (which still shows the Task 14 stub). Cover the lens: the hard tips appear with "Retake photos"; after two failures "Use these anyway" appears. In desktop Chrome with the camera blocked: "Camera not available", upload works.

Run: `npm run typecheck && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/components/fit
git commit -m "Add camera capture, retake tips and on-device measuring

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: The draft fit step, WhatsApp handoff and saved profiles

**Files:**
- Create: `src/components/fit/ledger.tsx`, `src/components/fit/calibrate-form.tsx`, `src/components/fit/fit-preference-form.tsx`, `src/components/fit/size-advice.tsx`, `src/components/fit/order-brief-form.tsx`, `src/components/fit/send-on-whatsapp.tsx`, `src/components/fit/step-result.tsx`, `src/components/fit/profile-list.tsx`, `src/app/fit/profile/page.tsx`
- Modify: `src/components/fit/measure-flow.tsx` (result stub, profile loading)

**Interfaces:**
- Consumes: everything from Tasks 1 to 9 and 12; `.message-preview`, `.chips`, `.chip`, `.optional`, `.field-hint` from `globals.css`; `MessageIcon`, `Arrow`.
- Produces: `Ledger({draft, styleId})`, `CalibrateForm({draft, onChange(draft: Draft): void})`, `FitPreferenceForm({value, onChange})`, `SizeAdvicePanel({measures, fit})`, `OrderBriefForm({value, onChange})`, `SendOnWhatsApp({state})`, `StepResult(props: StepProps & {onRemeasure(): void; onRestart(): void})`, `ProfileList()`; route `/fit/profile`; `/fit/measure?profile=<id>` loads a saved profile.

- [ ] **Step 1: Write `ledger.tsx`**

```tsx
import {getStyle, type StyleId} from '@/lib/fit/styles';
import {confidenceLevel, sourceLabel} from '@/lib/fit/confidence';
import {formatCm, formatIn} from '@/lib/fit/units';
import type {Field} from '@/lib/fit/measures';
import type {Draft} from './flow-types';

const UPPER: [Field, string][] = [['bust', 'Bust'], ['waist', 'Waist'], ['hip', 'Hip'], ['shoulder', 'Shoulder'], ['acrossBack', 'Across back'], ['armhole', 'Armhole'], ['sleeve', 'Sleeve length'], ['kameez', 'Kameez length'], ['neck', 'Neck']];

export function Ledger({draft, styleId}: {draft: Draft; styleId: StyleId}) {
  const style = getStyle(styleId);
  const row = (key: Field, label: string) => {
    const cm = draft.measures[key], pct = draft.confidence[key]; const [num, unit] = formatIn(cm).split(' ');
    return <div className="ledger-row" key={key}>
      <dt>{label}<small>{sourceLabel(draft.measures.sources[key], key, styleId)}</small></dt>
      <dd><span className="ledger-in">{num}<small>{unit.toUpperCase()}</small></span><span className="ledger-cm">{formatCm(cm)}</span></dd>
      <div className="conf" data-level={confidenceLevel(pct)}><div className="conf-bar" aria-hidden="true"><span style={{width: `${pct}%`}}/></div><span>confidence {pct}%</span></div>
    </div>;
  };
  return <dl className="ledger">
    <div className="ledger-group">Kameez and upper</div>{UPPER.map(([k, l]) => row(k, k === 'kameez' ? style.kameezLabel : l))}
    <div className="ledger-group">{style.bottomTitle}</div>{style.bottomRows.map(r => row(r.key, r.label.replace(' / ', ' or ')))}
  </dl>;
}
```

- [ ] **Step 2: Write `calibrate-form.tsx`**

```tsx
'use client';
import {useState, type FormEvent} from 'react';
import {applyTapeCalibration} from '@/lib/fit/calibrate';
import {computeConfidence} from '@/lib/fit/confidence';
import {inToCm, formatIn} from '@/lib/fit/units';
import type {Draft} from './flow-types';

const ERRORS = {'tape-out-of-range': 'Tape values are usually between 16 and 63 in. Check the number.', 'scale-out-of-range': 'That is a long way from the photo estimate. Check the number and which measurement you took.'};

export function CalibrateForm({draft, onChange}: {draft: Draft; onChange(next: Draft): void}) {
  const [field, setField] = useState<'bust' | 'waist'>('bust');
  const [error, setError] = useState<string | null>(null);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const tape = Number(data.get('tape')), length = Number(data.get('length'));
    const r = applyTapeCalibration(draft.raw, field, inToCm(tape), length > 0 ? inToCm(length) : null);
    if (!r.ok) { setError(ERRORS[r.error]); return; }
    setError(null);
    onChange({...draft, measures: r.measures, calibration: r.calibration, confidence: computeConfidence(r.measures, draft.frontLm, draft.sideLm, draft.quality, true)});
  }
  function clear() { onChange({...draft, measures: draft.raw, calibration: null, confidence: computeConfidence(draft.raw, draft.frontLm, draft.sideLm, draft.quality, false)}); setError(null); }
  return <form className="fit-panel" onSubmit={apply} aria-labelledby="calibrate-title">
    <p className="eyebrow draft-eyebrow">BEST ACCURACY STEP</p><h2 id="calibrate-title">Correct with one tape measure</h2>
    <p className="fit-note">Measure your bust or waist once with a tape. Every girth scales to match. Lengths stay as photographed unless you also enter your kameez length.</p>
    <div className="fit-field"><label htmlFor="cal-field">I measured my</label><select id="cal-field" name="field" value={field} onChange={e => setField(e.target.value as 'bust' | 'waist')}><option value="bust">Bust</option><option value="waist">Waist</option></select></div>
    <div className="fit-field"><label htmlFor="tape">Tape measure, inches <span aria-hidden="true">*</span></label><input id="tape" name="tape" inputMode="decimal" required placeholder={`For example, ${formatIn(draft.raw[field]).replace(' in', '')}`} aria-describedby="tape-error"/></div>
    <div className="fit-field"><label htmlFor="length">Real kameez length, inches <span className="optional">Optional</span></label><input id="length" name="length" inputMode="decimal" placeholder="Leave blank to keep the photo lengths"/></div>
    <p id="tape-error" className="fit-error" role="alert" hidden={!error}>{error}</p>
    <div className="chips"><button className="button button-primary" type="submit">Apply tape</button>{draft.calibration && <button className="button button-outline" type="button" onClick={clear}>Clear</button>}</div>
    {draft.calibration && <p className="fit-note">Calibrated to your {draft.calibration.field} tape of {formatIn(draft.calibration.tapeCm)}. Girths scaled by {draft.calibration.scale}.</p>}
  </form>;
}
```

- [ ] **Step 3: Write `fit-preference-form.tsx` and `size-advice.tsx`**

```tsx
'use client';
import {FIT_LABELS, NECKLINE_LABELS, SLEEVE_LABELS, type FitId, type FitPreference, type NecklineId, type SleeveId} from '@/lib/fit/fit-preference';

function Chips<T extends string>({legend, options, value, onChange}: {legend: string; options: Record<T, string>; value: T; onChange(v: T): void}) {
  return <fieldset><legend>{legend}</legend><div className="chips">{(Object.keys(options) as T[]).map(k => <button key={k} type="button" className="chip" aria-pressed={value === k} onClick={() => onChange(k)}>{options[k]}</button>)}</div></fieldset>;
}

export function FitPreferenceForm({value, onChange}: {value: FitPreference; onChange(next: FitPreference): void}) {
  return <section className="fit-panel" aria-labelledby="pref-title"><h2 id="pref-title">How you like it to sit</h2>
    <Chips<FitId> legend="Fit" options={FIT_LABELS} value={value.fit} onChange={fit => onChange({...value, fit})}/>
    <Chips<SleeveId> legend="Sleeve" options={SLEEVE_LABELS} value={value.sleeve} onChange={sleeve => onChange({...value, sleeve})}/>
    <Chips<NecklineId> legend="Neckline" options={NECKLINE_LABELS} value={value.neckline} onChange={neckline => onChange({...value, neckline})}/>
    <div className="fit-field"><label htmlFor="length-note">Length note <span className="optional">Optional</span></label><input id="length-note" maxLength={120} placeholder="For example, just below the knee" value={value.lengthNote} onChange={e => onChange({...value, lengthNote: e.target.value})}/></div>
    <p className="fit-note">Fitted takes 1 cm off the girths before we compare with the size chart, Relaxed adds 2.5 cm. The numbers above do not change.</p>
  </section>;
}
```

```tsx
import {recommendSize, sizeAdviceLine, SIZE_CHART} from '@/lib/fit/size-advice';
import type {Measures} from '@/lib/fit/measures';
import type {FitId} from '@/lib/fit/fit-preference';

export function SizeAdvicePanel({measures, fit}: {measures: Measures; fit: FitId}) {
  const advice = recommendSize(measures, fit);
  return <section className="fit-panel" aria-labelledby="size-title"><p className="eyebrow draft-eyebrow">DRAFT GUIDE ONLY</p><h2 id="size-title">Size advice</h2>
    <p>{sizeAdviceLine(advice)}</p>
    <p className="fit-note">Our heaviest ready stock is M and L (38 to 40 in bust). Made to measure is always available. This guide is checked against your tape before anything is cut.</p>
    <details><summary>The chart we compared with</summary><table className="fit-chart"><thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody>{SIZE_CHART.map(b => <tr key={b.size} aria-current={b.size === advice.closest ? 'true' : undefined}><th scope="row">{b.size}</th><td>{b.bustMin} to {b.bustMax} in</td><td>{b.waistMin} to {b.waistMax} in</td><td>{b.hipMin} to {b.hipMax} in</td></tr>)}</tbody></table></details>
  </section>;
}
```

Add to `fit.css`: `.fit-chart{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}.fit-chart th,.fit-chart td{text-align:left;padding:8px 0;border-bottom:1px solid var(--line)}.fit-chart tr[aria-current] th,.fit-chart tr[aria-current] td{color:var(--flame)}`

- [ ] **Step 4: Write `order-brief-form.tsx`**

```tsx
'use client';
import type {OrderBrief} from '@/lib/enquiries/messages';

const fabrics = ['Silk', 'Georgette', 'Organza', 'Velvet', 'Chanderi', 'Help me choose'];
const occasions = ['Wedding', 'Wedding guest', 'Celebration', 'Everyday dressing', 'Something else'];

export function OrderBriefForm({value, onChange}: {value: OrderBrief; onChange(next: OrderBrief): void}) {
  const set = (patch: Partial<OrderBrief>) => onChange({...value, ...patch});
  return <details className="fit-panel"><summary>Add order details <span className="optional">Optional</span></summary>
    <fieldset><legend>A fabric in mind?</legend><div className="chips">{fabrics.map(f => <button key={f} type="button" className="chip" aria-pressed={value.fabric === f} onClick={() => set({fabric: value.fabric === f ? '' : f})}>{f}</button>)}</div></fieldset>
    <div className="fit-field"><label htmlFor="occasion">The occasion</label><select id="occasion" value={value.occasion} onChange={e => set({occasion: e.target.value})}><option value="">Select your occasion</option>{occasions.map(o => <option key={o}>{o}</option>)}</select></div>
    <div className="fit-field"><label htmlFor="city">Delivery city and country</label><input id="city" maxLength={150} placeholder="For example, Toronto, Canada" value={value.city} onChange={e => set({city: e.target.value})}/></div>
    <div className="fit-field"><label htmlFor="deadline">Needed by</label><input id="deadline" type="date" value={value.deadline} onChange={e => set({deadline: e.target.value})}/></div>
    <div className="fit-field"><label htmlFor="notes">Notes</label><textarea id="notes" rows={3} maxLength={500} placeholder="Colour, embroidery, anything the tailor should know" value={value.notes} onChange={e => set({notes: e.target.value})}/></div>
  </details>;
}
```

- [ ] **Step 5: Write `send-on-whatsapp.tsx`**

```tsx
'use client';
import {useMemo, useState} from 'react';
import {Arrow, MessageIcon} from '../icons';
import {composeMeasurementDraft, composeOrderBrief, whatsappUrl} from '@/lib/enquiries/messages';
import {encodeDraftCode} from '@/lib/fit/handoff';
import {recommendSize} from '@/lib/fit/size-advice';
import {FIELDS, type Values} from '@/lib/fit/measures';
import type {FlowState} from './flow-types';

export function SendOnWhatsApp({state}: {state: FlowState}) {
  const [kind, setKind] = useState<'draft' | 'brief'>('draft');
  const [copied, setCopied] = useState(false);
  const message = useMemo(() => {
    const d = state.draft!; const m = d.measures;
    const code = encodeDraftCode({v: 1, style: state.styleId, fit: state.preference.fit, heightCm: state.heightCm!, calibrated: !!d.calibration, m: Object.fromEntries(FIELDS.map(f => [f, m[f]])) as Values});
    const input = {name: state.name, styleId: state.styleId, preference: state.preference, heightCm: state.heightCm!, measures: m, confidence: d.confidence, calibration: d.calibration, advice: recommendSize(m, state.preference.fit), date: new Date(), code};
    return kind === 'brief' ? composeOrderBrief({...input, brief: state.brief}) : composeMeasurementDraft(input);
  }, [state, kind]);
  const hasBrief = Object.values(state.brief).some(Boolean);
  async function copy() { try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } }
  return <section className="message-preview" aria-label="Your WhatsApp message">
    <p className="eyebrow">YOUR MESSAGE</p><h3>Check it, then send it to us.</h3>
    {hasBrief && <div className="chips"><button type="button" className="chip" aria-pressed={kind === 'draft'} onClick={() => setKind('draft')}>Measurement draft</button><button type="button" className="chip" aria-pressed={kind === 'brief'} onClick={() => setKind('brief')}>Order brief</button></div>}
    <p className="preserve-lines">{message}</p>
    <a className="button button-primary" href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer"><MessageIcon/> Continue to WhatsApp <Arrow diagonal/></a>
    <div className="chips"><button type="button" className="button button-outline" onClick={copy}>{copied ? 'Copied' : 'Copy the text'}</button></div>
    <p className="field-hint">Opens WhatsApp in a new tab. You choose whether to press send. Nothing is sent until you do.</p>
  </section>;
}
```

- [ ] **Step 6: Write `step-result.tsx`**

```tsx
'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Arrow} from '../icons';
import {Ledger} from './ledger';
import {CalibrateForm} from './calibrate-form';
import {FitPreferenceForm} from './fit-preference-form';
import {SizeAdvicePanel} from './size-advice';
import {OrderBriefForm} from './order-brief-form';
import {SendOnWhatsApp} from './send-on-whatsapp';
import {getStyle} from '@/lib/fit/styles';
import {formatIn} from '@/lib/fit/units';
import {browserProfileStore} from '@/lib/fit/device-store';
import type {StepProps} from './flow-types';

const PHOTOS = {landmarks: 'front and side photos', hybrid: 'front photo only', ratio: 'height only', none: 'height only'} as const;

export function StepResult({state, update, onRemeasure, onRestart}: StepProps & {onRemeasure(): void; onRestart(): void}) {
  const draft = state.draft!; const style = getStyle(state.styleId);
  const [saved, setSaved] = useState<'idle' | 'ok' | 'failed'>('idle');
  const adjusted = draft.measures.sources && Object.values(draft.measures.sources).some(s => s === 'ratio-clamped');
  function save() {
    const r = browserProfileStore().save({id: state.profileId ?? undefined, name: state.name, styleId: state.styleId, heightCm: state.heightCm!, kameezOverrideCm: state.kameezOverrideCm, preference: state.preference, measures: draft.measures, rawMeasures: draft.raw, calibration: draft.calibration, confidence: draft.confidence, brief: state.brief});
    if (r.ok && r.profile) { update({profileId: r.profile.id}); setSaved('ok'); } else setSaved('failed');
  }
  return <main id="main" className="fit-step">
    <div><p className="eyebrow draft-eyebrow">DRAFT, TAILOR TO VERIFY</p><h1>Your draft fit</h1>
      <p className="fit-summary"><span>{state.name || 'Your measurements'}</span><span>{style.label}</span><span>Height {formatIn(state.heightCm!)}</span><span>From {PHOTOS[draft.measures.mode]}</span></p></div>
    <p className="fit-lede">{draft.calibration ? 'Calibrated to your tape. Girths are usually within half an inch to an inch now.' : 'Before a tape measurement, girths can be off by an inch or two, sometimes more. The tape step below is the one that matters most.'}{adjusted ? ' Some values were adjusted to typical body proportions because the photo did not give a clear reading.' : ''}</p>
    <Ledger draft={draft} styleId={state.styleId}/>
    <CalibrateForm draft={draft} onChange={next => update({draft: next})}/>
    <FitPreferenceForm value={state.preference} onChange={preference => update({preference})}/>
    <SizeAdvicePanel measures={draft.measures} fit={state.preference.fit}/>
    <OrderBriefForm value={state.brief} onChange={brief => update({brief})}/>
    <div className="chips"><button type="button" className="button button-outline" onClick={save}>{state.profileId ? 'Update saved measures' : 'Save to this phone'}</button><Link className="text-link" href="/fit/profile">Saved measures <Arrow/></Link></div>
    <p className="fit-note" role="status">{saved === 'ok' ? 'Saved in this browser only. Nothing leaves your phone.' : saved === 'failed' ? "Couldn't save on this phone. Private browsing or full storage can cause this. You can still send the draft." : ''}</p>
    <SendOnWhatsApp state={state}/>
    <div className="fit-actions"><button type="button" className="button button-outline" onClick={onRemeasure}>Retake photos</button><button type="button" className="text-link" onClick={onRestart}>Start over</button></div>
  </main>;
}
```

- [ ] **Step 7: Profile page and list**

`src/components/fit/profile-list.tsx`:

```tsx
'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {Arrow} from '../icons';
import {browserProfileStore, type SavedProfile} from '@/lib/fit/device-store';
import {getStyle} from '@/lib/fit/styles';
import {formatIn} from '@/lib/fit/units';

export function ProfileList() {
  const [profiles, setProfiles] = useState<SavedProfile[] | null>(null);
  const store = browserProfileStore();
  useEffect(() => { setProfiles(store.list()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (profiles === null) return <p className="fit-note">Looking for saved measures on this phone.</p>;
  if (!profiles.length) return <div className="fit-panel"><h2>Nothing saved yet</h2><p className="fit-note">Finish a fit and tap Save to this phone. Measures stay in this browser only.</p><Link className="button button-primary" href="/fit/measure">Start my fit <Arrow/></Link></div>;
  return <div className="profile-list">
    {profiles.map(p => <article className="profile-card" key={p.id}>
      <strong>{p.name || 'Saved measures'}</strong>
      <p className="fit-summary"><span>{getStyle(p.styleId).label}</span><span>Height {formatIn(p.heightCm)}</span><span>Bust {formatIn(p.measures.bust)}</span><span>Saved {new Date(p.savedAt).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}</span></p>
      {store.isStale(p) && <p className="fit-error">These are more than six months old. Re-measure before ordering.</p>}
      <div className="profile-card-actions"><Link className="button button-primary" href={`/fit/measure?step=result&profile=${p.id}`}>Use saved measures</Link><Link className="button button-outline" href={`/fit/measure?step=style&profile=${p.id}`}>Re-measure</Link><button type="button" className="button button-outline" onClick={() => { if (confirm('Delete these saved measures from this phone?')) { store.remove(p.id); setProfiles(store.list()); } }}>Delete</button></div>
    </article>)}
    <button type="button" className="text-link" onClick={() => { if (confirm('Delete everything Find Your Fit saved on this phone?')) { store.clear(); setProfiles([]); } }}>Delete all saved measures</button>
  </div>;
}
```

`src/app/fit/profile/page.tsx`:

```tsx
import {ProfileList} from '@/components/fit/profile-list';
export const metadata={title:'Saved measures'};
export default function Profile(){return <main id="main" className="page-width" style={{paddingBottom:'var(--chapter)'}}><div className="page-heading"><p className="eyebrow">FIND YOUR FIT</p><h1>Saved on <em>this phone.</em></h1><p>Your drafts stay in this browser so you need not re-photograph for every order. They are never uploaded.</p></div><ProfileList/></main>;}
```

- [ ] **Step 8: Finish `measure-flow.tsx`**

Replace the result stub and add profile loading:

```tsx
{step === 'result' && <StepResult state={state} update={update} onRemeasure={() => { update({front: null, side: null, draft: null, attempts: 0}); go('photos'); }} onRestart={() => { setState(initialFlow); go('style'); }}/>}
```

Add, after the `useState`:

```tsx
const profileId = params.get('profile');
useEffect(() => {
  if (!profileId) return;
  const p = browserProfileStore().list().find(x => x.id === profileId); if (!p) return;
  setState(s => ({...s, name: p.name, styleId: p.styleId, heightCm: p.heightCm, kameezOverrideCm: p.kameezOverrideCm, preference: p.preference, brief: p.brief ?? emptyBrief, profileId: p.id,
    draft: requested === 'result' ? {measures: p.measures, raw: p.rawMeasures ?? p.measures, confidence: p.confidence, calibration: p.calibration, frontLm: null, sideLm: null, quality: null} : null}));
}, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps
```

Import `browserProfileStore`, `emptyBrief`, `StepResult`. Because the guard redirects `?step=result` to `style` when `draft` is null, make the guard wait: compute `step` only after this effect has had a chance to run by treating `profileId && requested === 'result' && !state.draft && !loadedProfile` as "loading" and rendering the Suspense fallback heading until `loadedProfile` is set (a `useState<boolean>` flipped in the effect, including when no profile matches).

- [ ] **Step 9: Check in the browser**

With photos blocked (DevTools, block `*/models/*`), run the height-only path to the result. Expected: the DRAFT eyebrow in flame, the ledger with inches large and cm small, every row "from height" with "confidence 48%" and a grey bar. Apply a bust tape of 34: the bust row reads "34 in", "your tape", bar turns flame; Clear restores. Switch Fit to Fitted: the size advice line changes. Add a brief: the WhatsApp preview gains a toggle and the brief text. Save: "Saved in this browser only." `/fit/profile` lists it; "Use saved measures" opens the result step with the ledger; Delete removes it. Check 390, 430 and 1440: no horizontal scroll, the sticky action bar never covers the last ledger row.

Run: `npm run typecheck && npm run lint && npm test`

- [ ] **Step 10: Commit**

```bash
git add src/components/fit src/app/fit src/app/fit/fit.css
git commit -m "Add the draft fit step, WhatsApp handoff and saved measures

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Playwright coverage and the visual review

**Files:**
- Create: `tests/fit.spec.ts`
- Review artefacts: screenshots in `.playwright-mcp/` (gitignored), not committed

**Interfaces:**
- Consumes: the routes and labels from Tasks 11 to 14. Button and link names used below must match exactly: "Start my fit", "Next: Photos", "Upload instead", "Use this photo", "Use height only", "Apply tape", "Save to this phone", "Continue to WhatsApp".

- [ ] **Step 1: Write the spec**

```ts
import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const routes = ['/fit', '/fit/measure', '/fit/profile'];

async function heightOnlyDraft(page: Page) {
  await page.route('**/models/**', r => r.abort()); // the pose model cannot load, so the flow must offer height only
  await page.goto('/fit/measure');
  await page.getByRole('button', {name: /Anarkali/}).click();
  await page.getByLabel(/^Height/).fill('64'); await page.getByLabel(/^Height/).blur();
  await page.getByRole('button', {name: 'Next: Photos'}).click();
  await expect(page).toHaveURL(/step=photos/);
  for (const shot of ['front', 'side']) {
    await page.getByLabel('Upload a photo').setInputFiles({name: `${shot}.png`, mimeType: 'image/png', buffer: PNG});
    await page.getByRole('button', {name: 'Use this photo'}).click();
  }
  await page.getByRole('button', {name: 'Use height only'}).click();
  await expect(page).toHaveURL(/step=result/);
}

test('fit routes render one h1 without horizontal overflow', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const route of routes) { await page.goto(route); await expect(page.locator('main h1')).toHaveCount(1); for (const width of [390, 430, 768, 1024, 1440]) { await page.setViewportSize({width, height: 900}); expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}`).toBe(width); } }
  expect(errors).toEqual([]);
});

test('the measuring shell hides the site chrome and the tape rail tracks the step', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844}); await page.goto('/fit/measure');
  await expect(page.locator('.site-header')).toBeHidden(); await expect(page.locator('.floating-contacts')).toBeHidden();
  await expect(page.locator('.tape-steps li[aria-current=step]')).toHaveText(/01Style/);
  await page.emulateMedia({reducedMotion: 'reduce'});
  expect(await page.locator('.tape-progress').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
});

test('height is validated beside the field and style cards work from the keyboard', async ({page}) => {
  await page.goto('/fit/measure');
  await page.getByLabel(/^Height/).fill('640'); await page.getByLabel(/^Height/).blur();
  await expect(page.getByRole('alert').filter({hasText: 'between 47 and 87'})).toBeVisible();
  const sharara = page.getByRole('button', {name: /Sharara/}); await sharara.focus(); await page.keyboard.press('Space');
  await expect(sharara).toHaveAttribute('aria-pressed', 'true');
});

test('height-only draft reaches WhatsApp with inches first and the DRAFT code', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await heightOnlyDraft(page);
  await expect(page.getByText('DRAFT, TAILOR TO VERIFY')).toBeVisible();
  await expect(page.locator('.ledger-row').first()).toContainText('from height');
  await expect(page.locator('.ledger-group').nth(1)).toHaveText('Bottom (under Anarkali)');
  const href = (await page.getByRole('link', {name: 'Continue to WhatsApp'}).getAttribute('href'))!;
  const text = new URL(href).searchParams.get('text')!;
  expect(new URL(href).origin + new URL(href).pathname).toBe('https://wa.me/918699841800');
  expect(text).toContain('Photos: height only'); expect(text).toContain('Anarkali length:'); expect(text).toMatch(/Draft code: GW1\./); expect(text).not.toMatch(/[—–]/);
});

test('tape calibration validates and recolours the bust row', async ({page}) => {
  await heightOnlyDraft(page);
  await page.getByLabel(/Tape measure/).fill('10'); await page.getByRole('button', {name: 'Apply tape'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'between 16 and 63'})).toBeVisible();
  await page.getByLabel(/Tape measure/).fill('34'); await page.getByRole('button', {name: 'Apply tape'}).click();
  const bust = page.locator('.ledger-row', {hasText: 'Bust'}).first();
  await expect(bust).toContainText('34'); await expect(bust).toContainText('your tape'); await expect(bust.locator('.conf')).toHaveAttribute('data-level', 'high');
});

test('saving keeps the draft on this phone and the profile page can reopen it', async ({page}) => {
  await heightOnlyDraft(page);
  await page.getByRole('button', {name: 'Save to this phone'}).click();
  await expect(page.getByRole('status')).toContainText('Saved in this browser only');
  await page.goto('/fit/profile');
  await expect(page.locator('.profile-card')).toHaveCount(1);
  await page.getByRole('link', {name: 'Use saved measures'}).click();
  await expect(page).toHaveURL(/step=result/); await expect(page.locator('.ledger-row')).toHaveCount(13);
});

test('accessibility checks on the fit routes', async ({page}) => {
  test.setTimeout(120000);
  for (const width of [390, 1440]) { await page.setViewportSize({width, height: 900}); for (const route of routes) { await page.goto(route); const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(result.violations, `${route} at ${width}`).toEqual([]); } }
  await heightOnlyDraft(page);
  const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(result.violations).toEqual([]);
});
```

- [ ] **Step 2: Run it**

Run: `npm run test:ui -- tests/fit.spec.ts`
Expected: all pass. Where an assertion fails because a label differs from the implementation, fix whichever side is wrong against the plan; do not loosen the assertion.

Also run the existing suites: `npm run test:ui`. The foundation test's route list does not include `/fit`; add `'/fit'` and `'/fit/profile'` to `routes` in `tests/foundation.spec.ts` so the overflow and h1 checks cover them too.

- [ ] **Step 3: Visual review against the design notes**

With `npm run dev` running, screenshot `/fit`, `/fit/measure` (style step), the camera step with the camera blocked, and the result step at 390, 430 and 1440 into `.playwright-mcp/fit-*.png`. Check, and fix in `fit.css` where needed:

- The tape rail reads as a tape: fine ticks, taller ticks every fifth, flame progress aligned to the step labels.
- One `h1` per screen, Bodoni, no text over imagery.
- Ledger values align on the right at every width; inches large, cm small; confidence bar colour matches the printed percentage band.
- Nothing from the prototype crept back in: no gold, no pills, no gradients as decoration, no sparkle wallpaper, no em dashes anywhere (`grep -rn "—\|–" src/components/fit src/app/fit src/lib/fit` returns nothing).
- The sticky action bar never hides the last row at 390px.
- With `prefers-reduced-motion`, nothing animates.

Remove one thing that is not earning its place (the Chanel rule), then commit.

- [ ] **Step 4: Commit**

```bash
git add tests/fit.spec.ts tests/foundation.spec.ts src/app/fit/fit.css
git commit -m "Add Playwright coverage for Find Your Fit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage (part 1 scope).** 4.1 routes `/fit`, `/fit/measure`, `/fit/profile`: Tasks 11, 12, 14. App shell: Task 10. 4.6 on-device engine: Tasks 3, 9. 4.7 modules: `pose` (9), `retake` (4), `styles` (2), `measures` (1), `estimate` (3), `confidence` (6), `calibrate` (5), `fit-preference` (5), `size-advice` (5), `handoff` (7), `device-store` (8), `messages` (7). `phone.ts` and `tryon-prompt.ts` belong to parts 2 and 3. 4.8 components: all except `PhoneField`, `ConsentGate`, `LookPicker`, `TryOnPreview`, `StudioNav`, `ClientList`, `ImportCode`, `TailorCompare` (parts 2 and 3). Section 5 copy: Tasks 11, 14. Section 6 errors covered here: camera denied (13), pose fails (13), no pose or model fails (13), localStorage (8, 14), invalid height and tape (12, 14). Section 7 unit tests: Tasks 1 to 9; Playwright: 15.
- **Not in part 1, by design.** The gate, Supabase, token, privacy page section, Studio, try-on, daily caps. `/fit/measure` is reachable without the gate until part 2 adds the redirect. The site is already `noindex`.
- **Type consistency.** `Measures` carries `sources`, `mode`, `scaleMethod`, `warnings`, optional `calibrated` everywhere. `Draft` holds `raw` for Clear. `StepId` is shared by `TapeRail` and `MeasureFlow`. `OrderBrief` lives in `messages.ts` and is imported by `device-store.ts` and the forms.
- **Review Focus mapping.** 1 → Tasks 3 and 4 tests. 2 → Task 12 (`HeightField`) and the Playwright height test. 3 → Task 5 tests and the Playwright calibration test. 4 → Task 8 throwing-storage test and the Task 14 failed-save message. 5 → Task 9 `model-unavailable` test and the Playwright height-only journey.

## What comes next

- **Part 2 plan:** gate (`/fit/start`, `PhoneField`, consent), Supabase schema and RLS, signed token, preference sync, privacy page section, Studio (login, Clients, Orders, Import DRAFT code, Tailor), redirects for the fit routes.
- **Part 3 plan:** Gemini try-on spike and, if it passes, `/fit/try-on`, `LookPicker`, `TryOnPreview`, daily caps.
