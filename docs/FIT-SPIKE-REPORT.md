# Find Your Fit try-on spike report

Status: **not run yet.** Needs the client's billing-enabled Gemini key and one consenting test person (spec section 9).

## How to run

```
GEMINI_API_KEY=... GEMINI_PAID_TIER_CONFIRMED=true \
  node --experimental-strip-types scripts/fit-tryon-spike.mjs --person ./person.jpg
```

The script runs `gemini-3.1-flash-image` and `gemini-3-pro-image` on the three catalogue looks (the full silhouette
photo of each) and writes the previews to `.fit-spike/`, which is gitignored and never deployed. Do not commit the
test person's photo or the outputs.

## Scoring

Score each output from 1 (wrong) to 5 (indistinguishable from the reference) on:

1. Dupatta preserved
2. Embroidery recognisable
3. Colour accurate
4. Silhouette correct
5. Person unchanged (face, skin tone, body shape, pose, background)

**Go** when one model scores at least 4 on "Dupatta preserved" and "Person unchanged" for all three looks, and at
least 3 on every other criterion. Otherwise **no go**: Release 1 ships without `/fit/try-on` and the client decides
next steps.

## Results

Paste the table the script prints here and fill in the scores.

## Decision

- Model chosen:
- Go or no go:
- Date and who scored:

When it is a go, set `GEMINI_IMAGE_MODEL` to the chosen model, then `FIT_TRYON_ENABLED=true` and
`GEMINI_PAID_TIER_CONFIRMED=true` in the Vercel project.
