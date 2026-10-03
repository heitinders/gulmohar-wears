# Gulmohar Wears · Find Your Fit

Premium mobile web app for **draft** Punjabi suit measurements (AI photo + height), **profiles**, **tailor verification**, **fit preference**, **order briefs**, **Collection**, and **draft** virtual try-on with WhatsApp order.

> Not a final cut sheet. Uncalibrated photo AI can miss by several inches. After **one tape calibration** (bust or waist), girths are typically **~±0.5–1 in**. Retake detection blocks bad poses. Every number is marked **DRAFT — tailor to verify** before cutting fabric.

---

## Dual mode

| Mode | Who | Nav |
|------|-----|-----|
| **Customer Mode** (default) | Shoppers | Home · My Fit · Collection · Profile |
| **Gulmohar Studio** | Staff | Fit · Clients · Inventory · Tailor · Orders · Try-on |

**Enter Studio:** Settings gear (⚙) or footer **Gulmohar Studio** → Enter → PIN stub `gulmohar`.  
**Exit:** Settings → Back to Customer Mode.  
Persisted in `localStorage` key `gulmohar_app_mode_v1`.

Customer never sees internal labels **Inventory / Clients / Tailor** in the main nav. Studio keeps those names.

---

## Live / open

| Environment | URL |
|-------------|-----|
| Public (temporary Cloudflare tunnel) | See `PUBLIC_URL.txt` or current tunnel hostname |
| Local on box | `http://127.0.0.1:8765/` |

**Phone:** open the HTTPS link → hard-refresh once → allow camera if prompted.

```bash
cd /workspace/gulmohar-wear/measure-app
python3 -m http.server 8765
```

Must be served over **HTTP(S)** (not `file://`) so MediaPipe and camera work.

---

## Brand & design tokens

| Token | Value | Use |
|-------|-------|-----|
| Ivory | `#faf6f0` / cream `#fffdf9` | Page & card grounds |
| Wine / burgundy | `#6b1e2a` · deep `#4a121c` | Primary CTAs, headings, nav active |
| Antique gold | `#b8965a` / muted `#c4a574` | Accents, progress done, tagline |
| Bloom (sparingly) | `#F15A24` | Legacy accent; used lightly |
| Serif headings | Cormorant Garamond | Editorial titles |
| Sans UI | DM Sans | Controls, body |
| Logo | `assets/logo-mark.png` | Circular floral mark — **no black square** (`border-radius: 50%`, white ground) |
| WhatsApp | `+91 86998 41800` → `https://wa.me/918699841800` |
| Tagline | Wear the Bloom. |

Style silhouette cards: `assets/styles/{punjabi,anarkali,sharara,farshi}.jpg`

---

## Customer experience

### Home
- **GULMOHAR WEARS** / *Wear the Bloom.*
- Headline: **Find Your Gulmohar Fit**
- Sub: Personal measurements and beautiful Punjabi silhouettes, tailored around you.
- Primary CTA: **START MY FIT**
- Three-step: **01 Measure → 02 Try On → 03 Tailor Verify**
- Expandable **How accurate is this?** (full cut warning stays on results / finalize)

### My Fit — progress
`Measurements → Photos → Fit → Try On`

1. **Measurements** — illustrated style cards (Classic Punjabi / Anarkali / Sharara / Farshi) + name + **height in inches** + optional length  
2. **Photos** — front → side (camera or upload); retake detection  
3. **Fit** — draft table, confidence %, tape calibration, fit preference, AI size advice, order brief, WhatsApp  
4. **Try On** — Collection piece overlay → I like this → size/MTM → WhatsApp  

### Collection
Browse suits (read-only). Tap a piece → Try-on. No upload form.

### Profile
Saved measures on this phone (same store as Studio Clients). Open → **Use saved measures** (skip photos) or **Re-measure**.

---

## Studio experience

| Tab | Purpose |
|-----|---------|
| Fit | Same measurement engine as My Fit |
| Clients | Full client list, open / delete, verified values |
| Inventory | Upload / delete product images |
| Tailor | AI vs corrected inches; bias learning |
| Orders | Clients with fabric/occasion/city/deadline briefs |
| Try-on | Staff try-on + WhatsApp order |

---

## Feature reference (logic unchanged)

### Style pick
| Style | Default kameez | Bottom emphasis |
|-------|----------------|-----------------|
| Classic Punjabi | ~45% height | Salwar length |
| Anarkali | ~58% height | Churidar / salwar under |
| Sharara | ~48% height | Sharara length, thigh, flare |
| Farshi | ~52% height | Farshi / floor length & opening |

### Units
**Primary UI unit: inches** (Punjabi / Indian tailor convention). Labels use `in` / `″`.
Internal MediaPipe / ratio engine still computes in **cm**, then converts at the UI boundary (`÷ 2.54` display, `× 2.54` inputs). Height, tape calibration, drafts, tailor verify, WhatsApp, fit ease — all shown in inches (typically 1 decimal).

### Fit preference
Fitted / Regular / Relaxed (−0.4 / 0 / +1 in ease · same physical ease as −1 / 0 / +2.5 cm) + sleeve + neckline + length note.

### AI size recommendation
Bust+waist+hip vs S–XL chart (already inches); MTM if overflow ≥~0.8 in (~2 cm). Heaviest ready stock **M/L (38–40″)**. DRAFT guide only.

### Confidence & retake
Per-field confidence %. Hard pose issues block Estimate (Force available).

### Tape calibration
One real bust or waist → scales all girths.

### Tailor verify & learn
`gulmohar_tailor_learn_v2` — global + per-client bias (stored as cm deltas internally; UI shows inches); applied on next photo estimates when toggles on.

### Order from Try-on
Ready S/M/L/XL or MTM → WhatsApp order card.

### Profile skip re-photo
Use saved / verified measures; stale after 6 months; optional weight note.

---

## WhatsApp cards

All: `https://wa.me/918699841800?text=…`

- Measurement DRAFT  
- Order brief  
- Try-on share / **I like this** order  

---

## localStorage keys

| Key | Purpose |
|-----|---------|
| `gulmohar_clients_v2` | Profiles (measures stored as cm internally; UI inches). Bumped from v1 so old cm values are not shown as inches. |
| `gulmohar_inventory_v1` | Suit gallery |
| `gulmohar_tailor_learn_v2` | Bias deltas (cm internally). Bumped from v1 with the inches UI. |
| `gulmohar_app_mode_v1` | `customer` \| `studio` |

**Migration:** clients / tailor-learn keys bumped to `v2` (clear old cm data). Inventory and mode keys unchanged.

---

## File layout

```
measure-app/
  index.html
  app.js
  styles.css
  APP.md
  PUBLIC_URL.txt
  assets/
    logo-mark.png          # circular floral (no black square)
    logo.png / logo.jpg
    styles/
      punjabi.jpg
      anarkali.jpg
      sharara.jpg
      farshi.jpg
```

---

## Limits

- Client-side only; no cloud sync  
- Inventory constrained by browser storage  
- Tunnel URLs expire — use permanent host for clients  
- AI + bias ≠ substitute for tape before cutting  
- Studio PIN is a stub (`gulmohar`), not production auth  

---

*Gulmohar Wears · +91 86998 41800 · Wear the bloom.*
