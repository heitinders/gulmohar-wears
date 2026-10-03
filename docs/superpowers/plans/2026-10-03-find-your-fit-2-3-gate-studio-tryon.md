# Find Your Fit, parts 2 and 3: gate, Supabase, Studio and try-on. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add everything the spec still lacks after part 1: the consent gate with an international phone field, a Supabase schema protected by row-level security, a signed customer token, preference sync, the privacy section, the Studio (login, Clients, Orders, in-shop Fit, Tailor, Import), and Gemini try-on with daily caps. Try-on stays switched off until the spike passes.

**Architecture:** All server logic is plain TypeScript in `src/lib/fit/server/`, written as functions that take their dependencies (`FitStore`, `StudioAuth`, `TryOnProvider`, clock, secret) as arguments, so `node --test` covers it without Next or a network. Two implementations of each dependency: Supabase (production) and in-memory (development and Playwright only, refused when `NODE_ENV` is `production`). Next files (`actions.ts`, `route.ts`, `proxy.ts`, pages) only wire the request to these functions. The schema lives in `supabase/migrations/` and is tested for real against a throwaway local Postgres 14 cluster with a Supabase-shaped `auth` stub.

**Tech Stack:** Next.js 16.3.5, React 19, TypeScript, `@supabase/supabase-js`, `libphonenumber-js` (min metadata), `server-only`, Node 22 `node:test`, Postgres 14 (local tests), Playwright with axe.

**Spec:** `docs/superpowers/specs/2026-10-02-find-your-fit-design.md`, sections 2, 4.1 to 4.8, 5, 6, 7, 8. Part 1 plan: `docs/superpowers/plans/2026-10-02-find-your-fit-1-measure.md` (its constraints still apply).

## Global Constraints

- Everything in part 1's Global Constraints still holds (tokens, copy rules, no dashes in customer copy, inches first, 16px inputs, 48px targets, one `h1`, `.ts` sibling imports in `src/lib/**`).
- No measurement, height, weight, age or image ever reaches Supabase, a log line, an error message or analytics. The database has no columns for them.
- The service-role key and `FIT_TOKEN_SECRET` are read only in modules that `import "server-only"` (or are only imported by such modules). The browser gets the anon key only, and only Studio pages use it.
- Consent version string: `fit-consent-2026-10-02`. Consent text exactly as spec section 5.
- Token: `base64url(client_id) + "." + base64url(HMAC_SHA256(FIT_TOKEN_SECRET, client_id))`, compared in constant time. Stored on the phone as `gulmohar_fit_token_v1`.
- Phone: E.164, regex `^\+[1-9][0-9]{6,14}$`, default region IN, validated with `libphonenumber-js`.
- Try-on: 8 MB request limit, JPEG, PNG or WebP only, 1600px long edge on the phone, 45 s vendor timeout, `FIT_TRYON_DAILY_CAP` default 6, `FIT_STUDIO_DAILY_CAP` default 30, 503 unless `GEMINI_PAID_TIER_CONFIRMED=true`. A vendor failure does not consume allowance.
- Backend mode (`fitBackend()`): `supabase` when `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `FIT_TOKEN_SECRET` are all set; `memory` when `FIT_BACKEND=memory` and `NODE_ENV` is not `production`; otherwise `off`. With `off`, the site behaves exactly as part 1 (no gate, Studio says it is not connected). This keeps the live site working until the client supplies Supabase.
- Try-on available only when backend is not `off`, `FIT_TRYON_ENABLED=true`, `GEMINI_PAID_TIER_CONFIRMED=true`, and either `GEMINI_API_KEY` plus `GEMINI_IMAGE_MODEL` are set, or `FIT_TRYON_PROVIDER=fake` outside production.
- Commit style: imperative subject, no type prefix, ending with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Phone typed with spaces, a leading 0 or the wrong country.** `98765 43210` with India selected must become `+919876543210`; `0044 7400 123456` with India selected is India's exit code, so it must become `+447400123456`; a UK number typed without its code under India (`7400 123456`) must be refused with a message naming India; a UK number pasted with `+44` must win over the selected country. Tests in Task 2.
2. **Token tampered, truncated or signed with an old secret.** Every server entry returns `invalid-token`, the phone clears its token and goes back to the gate. Tests in Task 3 and Task 8.
3. **Supabase down or misconfigured at the gate.** The gate shows a retry message with the WhatsApp link, never a stack trace, and measuring is never blocked by a failed preference sync. Tests in Task 6 and Task 8.
4. **A staff session that has expired, or a signed-in user who is not on the staff list.** The first goes through refresh in `proxy.ts`, the second gets the login page with "This account is not on the studio list." and no data. Tests in Task 10 and the RLS test in Task 4.
5. **Try-on hit twice at the cap boundary, or the vendor failing.** The sixth success is allowed, the seventh refused with the cap message, and a failed vendor call leaves the count unchanged. Tests in Task 15.

---

## File structure

```
supabase/migrations/20261003000000_find_your_fit.sql   tables, RLS, grants, fit_bump_usage()
supabase/tests/auth-stub.sql                            Supabase-shaped auth schema and roles for local tests
tests/db/rls.test.ts                                    throwaway Postgres 14 cluster, real RLS assertions (npm run test:db)
.env.example                                            every variable, with what it does
src/lib/fit/phone.ts                                    parsePhone, countryOptions, maskPhone
src/lib/fit/consent.ts                                  CONSENT_VERSION, CONSENT_TEXT
src/lib/fit/client-token.ts                             browser token + pending preference storage (try/catch)
src/lib/fit/preference-sync.ts                          toPreferencePatch (whitelist, shared)
src/lib/fit/server/config.ts                            fitBackend, tryOnConfig, caps
src/lib/fit/server/token.ts                             signClientToken, verifyClientToken
src/lib/fit/server/store.ts                             FitStore interface, ClientRow, memory store
src/lib/fit/server/supabase-store.ts                    FitStore over supabase-js (service role and staff JWT)
src/lib/fit/server/rate-limit.ts                        fixed window limiter
src/lib/fit/server/register.ts                          registerClient, checkClient
src/lib/fit/server/preference.ts                        updatePreference
src/lib/fit/server/studio-auth.ts                       StudioAuth interface, memory auth, supabase auth, session cookies
src/lib/fit/server/studio.ts                            requireStaff, listClients, listOrders, deleteClient
src/lib/fit/server/deps.ts                              server-only wiring from env to the above
src/lib/fit/studio-store.ts                             device-only Studio measures (gulmohar_studio_measures_v1)
src/lib/fit/tryon-prompt.ts                             TRYON_PROMPT_VERSION, buildTryOnPrompt
src/lib/fit/server/tryon-provider.ts                    TryOnProvider, GeminiTryOnProvider, FakeTryOnProvider
src/lib/fit/server/tryon.ts                             handleTryOn, handleReport
src/lib/fit/image.ts                                    downscaleImage (client)
src/lib/enquiries/messages.ts                           + composeTryOnOrder
src/lib/information.ts                                  + privacy "Find your fit" sections
src/app/[info]/page.tsx                                 section ids for anchors
src/app/fit/actions.ts                                  'use server' wrappers: registerFitClient, checkFitToken, syncFitPreference
src/app/fit/start/page.tsx                              gate (focused shell)
src/app/fit/try-on/page.tsx                             try-on (focused shell)
src/app/api/fit/try-on/route.ts                         POST try-on, GET availability
src/app/api/fit/try-on/report/route.ts                  POST report
src/app/studio/layout.tsx                               noindex metadata, studio.css
src/app/studio/studio.css
src/app/studio/login/page.tsx, actions.ts
src/app/studio/(staff)/layout.tsx                       requireStaff, StudioNav
src/app/studio/(staff)/page.tsx                         Clients
src/app/studio/(staff)/orders/page.tsx
src/app/studio/(staff)/fit/page.tsx
src/app/studio/(staff)/tailor/page.tsx
src/app/studio/(staff)/import/page.tsx
src/app/studio/(staff)/actions.ts                       deleteClientAction, signOutAction
src/proxy.ts                                            Studio session refresh
src/components/fit/phone-field.tsx, consent-gate.tsx, fit-gate.tsx
src/components/fit/look-picker.tsx, try-on-preview.tsx, try-on-flow.tsx
src/components/studio/studio-nav.tsx, client-list.tsx, import-code.tsx, tailor-compare.tsx, studio-fit.tsx, delete-client.tsx
scripts/fit-tryon-spike.mjs                             runs the spike once a paid key and a test photo exist
docs/FIT-SPIKE-REPORT.md                                scoring template, filled in when the spike runs
tests/fit.spec.ts, tests/studio.spec.ts, tests/tryon.spec.ts
playwright.config.ts                                    webServer env: memory backend, fake try-on
```

---

### Task 1: Schema, RLS and the real-database test

**Files:** Create `supabase/migrations/20261003000000_find_your_fit.sql`, `supabase/tests/auth-stub.sql`, `tests/db/rls.test.ts`. Modify `package.json` (`test:db`).

**Interfaces:** Produces tables `fit_clients`, `fit_usage`, `studio_staff` exactly as spec 4.3, and `public.fit_bump_usage(p_key text, p_day date, p_field text) returns int` (atomic upsert-increment of `tryons` or `reports`, executable by `service_role` only).

- [ ] Write `rls.test.ts` first. It creates a cluster with `initdb` in a temp dir on a free port, starts `postgres`, loads `auth-stub.sql` then the migration, and asserts with `psql` under `set role`:
  - anon: `select` on each table fails or returns 0 rows; `insert into fit_clients` fails.
  - authenticated non-staff (claim `sub` = a user not in `studio_staff`): `select count(*) from fit_clients` returns 0; `delete` affects 0 rows.
  - authenticated staff: sees the seeded row, can delete it, can select `fit_usage`, cannot `insert`/`update` `fit_clients`.
  - service_role: can insert; the phone check rejects `+0123`, `9876543210`; the brief check rejects `{"notes":"x"}` and accepts `{"city":"Leeds"}`; `fit_bump_usage` returns 1 then 2; anon and authenticated cannot execute it.
  - There is no column named like `%measure%`, `%height%`, `%weight%`, `%image%`, `%photo%` in the three tables.
  - The test skips (not fails) when `initdb` is not on PATH.
- [ ] Run `npm run test:db`, expect failure (no migration file).
- [ ] Write the stub (roles `anon`, `authenticated`, `service_role` with `bypassrls`, schema `auth`, `auth.users(id uuid primary key, email text)`, `auth.uid()` reading `current_setting('request.jwt.claim.sub', true)`, default privileges granting all on public tables to the three roles as Supabase does) and the migration (tables per spec, `enable row level security` on all three, policies `staff_select_clients`, `staff_delete_clients`, `staff_select_usage` using `exists (select 1 from studio_staff s where s.user_id = auth.uid())`, `studio_staff` select policy for the row's own user only, `fit_bump_usage` with `revoke execute ... from public, anon, authenticated` and `grant execute ... to service_role`, an `updated_at` trigger).
- [ ] Run, expect pass. Commit "Add the Find Your Fit schema with row-level security and a real-database test".

### Task 2: Phone parsing and consent copy

**Files:** `src/lib/fit/phone.ts`, `src/lib/fit/phone.test.ts`, `src/lib/fit/consent.ts`. Add `libphonenumber-js`.

**Interfaces:** `parsePhone(input: string, country: CountryCode): {ok: true; e164: string; country: CountryCode} | {ok: false; reason: 'empty' | 'invalid'; countryName: string}`; `countryOptions(locale = 'en'): {code: CountryCode; name: string; dial: string}[]` sorted by name with India first; `maskPhone(e164): string` (keeps the country code and last 4 digits, middle as `•`); `CONSENT_VERSION`, `CONSENT_TEXT`.

- [ ] Tests: `98765 43210`+IN → `+919876543210`; `+44 7911 123456` with IN → `+447911123456` country GB; `0044 7911 123456`+IN → invalid, `countryName` `India`; `12`+IN invalid; empty → `empty`; US `(415) 555-2671` → `+14155552671`; every e164 result matches the DB regex; `countryOptions()[0].code === 'IN'` and includes `GB`, `US`, `CA`, `AU`; `maskPhone('+919876543210') === '+91 ••••••3210'`; consent text contains no `—` or `–` and equals spec 5 verbatim.
- [ ] Fail, implement with `libphonenumber-js/min`, pass, commit "Add phone parsing and the consent wording".

### Task 3: Client token and backend config

**Files:** `src/lib/fit/server/token.ts` (+test), `src/lib/fit/server/config.ts` (+test).

**Interfaces:** `signClientToken(clientId: string, secret: string): string`; `verifyClientToken(token: unknown, secret: string): {ok: true; clientId: string} | {ok: false}`; `fitBackend(env = process.env): 'supabase' | 'memory' | 'off'`; `tryOnConfig(env): {available: boolean; provider: 'gemini' | 'fake' | null; model: string | null; dailyCap: number; studioCap: number; reason?: string}`.

- [ ] Tests: round trip; flipping one character of either half fails; another secret fails; non-string, empty, three-part and 10 kB tokens fail without throwing; uses `timingSafeEqual` (length mismatch guarded). Config: each mode from env combinations; `memory` ignored when `NODE_ENV=production`; try-on unavailable when paid flag missing (`reason: 'paid-tier-unconfirmed'`), when not enabled, when backend `off`; caps parse integers and fall back to 6 and 30 on garbage.
- [ ] Fail, implement, pass, commit "Add the signed client token and backend configuration".

### Task 4: FitStore, memory store and rate limiter

**Files:** `src/lib/fit/server/store.ts` (+test), `src/lib/fit/server/rate-limit.ts` (+test), `src/lib/fit/preference-sync.ts` (+test).

**Interfaces:**
```ts
interface ClientRow { id: string; phone: string; name: string; consentAt: string; consentVersion: string; style: StyleId | null; fit: FitId | null; sleeve: string | null; neckline: string | null; lengthNote: string | null; brief: BriefRow | null; createdAt: string; updatedAt: string }
interface BriefRow { occasion?: string; fabric?: string; city?: string; deadline?: string }
interface PreferencePatch { style?: StyleId; fit?: FitId; sleeve?: SleeveId; neckline?: NecklineId; lengthNote?: string; brief?: BriefRow | null }
interface FitStore {
  upsertClient(i: {phone: string; name: string; consentAt: string; consentVersion: string}): Promise<{id: string; phone: string}>;
  getClient(id: string): Promise<ClientRow | null>;
  updatePreference(id: string, patch: PreferencePatch): Promise<boolean>;
  getUsage(key: string, day: string): Promise<{tryons: number; reports: number}>;
  bumpUsage(key: string, day: string, field: 'tryons' | 'reports'): Promise<number>;
}
createMemoryStore(): FitStore & {staff: StaffDirectory}   // shared through globalThis in dev
toPreferencePatch(input: unknown): PreferencePatch        // whitelist and length limits; drops brief.notes and unknown keys
createRateLimiter({limit, windowMs, now?}): {take(key: string): boolean}
```
- [ ] Tests: upsert on same phone keeps the id and updates name and consent; preference patch drops `notes`, `heightCm`, `measures`, unknown keys, overlong strings (sleeve 60, length note 200, brief values 120), invalid style or fit; empty brief becomes `null`; usage increments per key and day independently; limiter allows `limit` then refuses until the window passes.
- [ ] Fail, implement, pass, commit "Add the client store, preference whitelist and rate limiter".

### Task 5: Supabase store and staff auth adapters

**Files:** `src/lib/fit/server/supabase-store.ts`, `src/lib/fit/server/studio-auth.ts` (+test for the memory auth and cookie helpers). Add `@supabase/supabase-js`, `server-only`.

**Interfaces:** `createSupabaseStore(url, serviceKey): FitStore`; `interface StudioAuth { signIn(email, password): Promise<{ok: true; session: Session} | {ok: false}>; getUser(accessToken): Promise<{id: string; email: string} | null>; refresh(refreshToken): Promise<Session | null>; signOut(accessToken): Promise<void> }`; `Session {accessToken; refreshToken; expiresAt: number}`; `createMemoryAuth(users)`, `createSupabaseAuth(url, anonKey)`; `SESSION_COOKIES = {access: 'gw_studio_at', refresh: 'gw_studio_rt', expires: 'gw_studio_exp'}`; `sessionCookieOptions(secure)`; `needsRefresh(expiresAt, now)` (true within 60 s of expiry).
- [ ] Tests (memory auth and helpers): sign in with the right password, wrong password fails; `getUser` on a signed-out token is null; refresh rotates tokens; `needsRefresh` boundaries; cookie options are `httpOnly`, `sameSite: 'lax'`, `path: '/studio'`, `secure` as given.
- [ ] The Supabase adapters map the same calls onto `supabase-js` (service-role client with `persistSession: false` for the store; `bumpUsage` through `rpc('fit_bump_usage')`; staff reads use a client created with the staff JWT so RLS applies). They are exercised against a live project only, listed under "Needs from the client".
- [ ] Commit "Add Supabase adapters and the studio session helpers".

### Task 6: Register, check and preference sync on the server

**Files:** `src/lib/fit/server/register.ts` (+test), `src/lib/fit/server/preference.ts` (+test), `src/lib/fit/server/deps.ts`, `src/app/fit/actions.ts`.

**Interfaces:**
```ts
registerClient(deps: {store; secret; limiter; now}, input: {name: unknown; phone: unknown; country: unknown; consent: unknown; consentVersion: unknown; website: unknown; ip: string}):
  Promise<{ok: true; token: string; phone: string; name: string} | {ok: false; error: 'name' | 'phone' | 'consent' | 'rate' | 'unavailable'; countryName?: string}>
checkClient(deps, token): Promise<{ok: true; name: string; phoneMasked: string} | {ok: false; error: 'invalid-token' | 'unavailable'}>
updatePreference(deps, token, patch): Promise<{ok: true} | {ok: false; error: 'invalid-token' | 'unavailable'}>
// actions.ts ('use server'): registerFitClient(formData), checkFitToken(token), syncFitPreference(token, patch)
```
- [ ] Tests: name trimmed, 1 to 80 chars; consent must be `true` and version must equal `CONSENT_VERSION`; filled honeypot `website` returns `ok: true`-shaped fake success without writing (bots learn nothing) — assert store untouched; 11th attempt from one IP in an hour → `rate`; store throwing → `unavailable` and nothing logged (console spied); same phone twice → same token; `checkClient` for a deleted client → `invalid-token`; `updatePreference` only writes whitelisted fields.
- [ ] `deps.ts` (`import 'server-only'`) builds deps from `fitBackend()`; actions return `{ok:false,error:'unavailable'}` when backend is `off`. Actions read the IP from `headers()` `x-forwarded-for` first entry.
- [ ] Fail, implement, pass, typecheck, commit "Add client registration and preference sync on the server".

### Task 7: Browser token storage and the gate guard

**Files:** `src/lib/fit/client-token.ts` (+test), `src/components/fit/fit-gate.tsx`.

**Interfaces:** `createClientTokenStore(storage: StorageLike | null): {get(): string | null; set(token, who: {name; phoneMasked}): boolean; who(): {name; phoneMasked} | null; clear(): void; pendingPreference(): PreferencePatch | null; setPendingPreference(p): void; clearPending(): void}`; `browserClientTokenStore()`. `<FitGate required: boolean next: string>{children}</FitGate>`: when required and no token, `router.replace('/fit/start?next=' + next)`; when a token exists, runs `checkFitToken` once per page load; `invalid-token` clears and redirects; `unavailable` or a network error lets the customer continue. When a pending preference exists, it retries `syncFitPreference` and clears it on success.
- [ ] Tests for the store with a throwing storage (never throws) and keys `gulmohar_fit_token_v1`, `gulmohar_fit_client_v1`, `gulmohar_fit_pending_pref_v1`.
- [ ] Commit "Add browser token storage and the fit gate guard".

### Task 8: Gate UI, wiring and preference sync from the result step

**Files:** `src/components/fit/phone-field.tsx`, `src/components/fit/consent-gate.tsx`, `src/app/fit/start/page.tsx`, modify `src/app/fit/page.tsx` (Start goes to `/fit/start`), `src/app/fit/measure/page.tsx` and `src/app/fit/profile/page.tsx` (wrap in `FitGate` with `required={fitBackend() !== 'off'}`; pages become dynamic by reading config at request time via `connection()`), `src/components/fit/step-result.tsx` (debounced sync of style, fit, sleeve, neckline, length note and brief, never measurements; failure stores pending), `src/app/fit/fit.css`.

- [ ] `/fit/start`: when backend is `off`, redirect to `/fit/measure`. Otherwise one `h1` "Before we measure", name, `PhoneField` (country `select` with India first plus a `tel` input, 16px, label "Phone or WhatsApp number"), consent checkbox with `CONSENT_TEXT` and a link to `/privacy#find-your-fit`, hidden honeypot `website` (`tabIndex=-1`, `autoComplete="off"`, visually hidden, `aria-hidden`), primary "Continue". Inline errors with `role="alert"` next to their fields: phone error names the country ("That doesn't look like a valid number for India."). `unavailable`: "We couldn't save your details just now. Try again, or message us on WhatsApp." with the WhatsApp link. When the phone already holds a valid token: "Welcome back, Simran" with the masked phone, "Continue" and "Not you? Use another number".
- [ ] Playwright (`tests/fit.spec.ts`, memory backend): gate refuses `0044...` with India selected, accepts `98765 43210`, lands on `/fit/measure`; the gate is keyboard-only operable; returning visit shows the welcome; visiting `/fit/measure` without a token redirects to `/fit/start?next=%2Ffit%2Fmeasure`; a tampered token in localStorage is cleared and redirected; existing part 1 tests pass through the gate first; axe on `/fit/start`.
- [ ] Commit "Add the consent gate, gate redirects and preference sync".

### Task 9: Privacy section

**Files:** `src/lib/information.ts`, `src/app/[info]/page.tsx`, test in `tests/fit.spec.ts`.

- [ ] Add sections to `privacy` (titles prefixed so the anchor is stable, first section id `find-your-fit`): what Find your fit stores (name, phone, consent time and version, style and fit choices, order brief fields), what it never stores (photos, measurements, height, try-on images), who processes photos (measuring: nobody, on the phone; try-on: the one photo goes through our server to Google Gemini on a paid plan and is not kept), deletion (WhatsApp or phone from `brand.ts`, the Studio deletes the record). Section headings get ids from a slug of the title. Playwright: `/privacy#find-your-fit` shows the heading; no dashes.
- [ ] Commit "Add the Find your fit privacy section".

### Task 10: Studio session, proxy and login

**Files:** `src/lib/fit/server/studio.ts` (+test), `src/proxy.ts`, `src/app/studio/layout.tsx`, `src/app/studio/studio.css`, `src/app/studio/login/page.tsx`, `src/app/studio/login/actions.ts`, `src/app/studio/(staff)/layout.tsx`, `src/app/studio/(staff)/actions.ts`, `src/components/studio/studio-nav.tsx`.

**Interfaces:** `requireStaff(deps: {auth; store}, cookies: {access?: string}): Promise<{ok: true; user: {id; email}; accessToken: string} | {ok: false; reason: 'signed-out' | 'not-staff' | 'unavailable'}>`; `refreshSessionCookies(auth, cookies, now): Promise<{set?: Session; clear?: true} | null>` used by `proxy.ts` on `/studio/:path*`.
- [ ] Tests: no cookie → signed-out; valid user not in staff → not-staff; staff → ok; refresh within 60 s of expiry sets new cookies; refresh failure clears them.
- [ ] Login page (noindex via `robots: {index: false}` in the studio layout metadata): email, password, "Sign in"; errors "Email or password is not right." and "This account is not on the studio list."; with backend `off`: "The studio is not connected yet." Staff layout redirects to `/studio/login` when not ok, renders `StudioNav` (Clients, Orders, Fit, Tailor, Import, Sign out).
- [ ] Commit "Add studio sign-in, session refresh and navigation".

### Task 11: Clients and Orders

**Files:** `src/lib/fit/server/studio.ts` (`listClients`, `listOrders`, `deleteClient` + tests), `src/app/studio/(staff)/page.tsx`, `orders/page.tsx`, `src/components/studio/client-list.tsx`, `delete-client.tsx`, `src/lib/fit/studio-store.ts` (+test).

**Interfaces:** `listOrders(rows)` keeps rows whose brief has any non-empty value, sorted by deadline ascending with no deadline last; `waLink(phone)` = `https://wa.me/<digits>`; studio store `createStudioStore(storage)`: `{list(); get(phone); save(entry: StudioEntry); attachTailor(phone, values: Partial<Values>, verified: Field[]); remove(phone)}` with `StudioEntry {phone; name; styleId; heightCm; fit; measures: Values; confidence: Partial<Record<Field, number>>; source: 'studio-fit' | 'import'; savedAt; tailor?: {values; verified; at}}` under `gulmohar_studio_measures_v1`.
- [ ] Tests: orders filter and sort; deleting needs staff (`requireStaff` result); studio store survives throwing storage; tailor corrections are kept alongside the original values, not over them.
- [ ] Clients table: name, phone (tap opens WhatsApp chat), style, fit, brief summary, last seen, "On this device" marker from the studio store, Delete with confirm. Empty state copy. Orders: same rows filtered and sorted, deadline shown first.
- [ ] Commit "Add the studio client list and orders".

### Task 12: Studio Fit, Tailor and Import

**Files:** `src/components/fit/measure-flow.tsx` (props `basePath` default `/fit/measure` and `studio?: {clients; onSave}`), `step-result.tsx` (studio mode replaces save-to-phone and WhatsApp with "Save for this client on this device"), `src/app/studio/(staff)/fit/page.tsx`, `src/components/studio/studio-fit.tsx`, `tailor/page.tsx`, `src/components/studio/tailor-compare.tsx`, `import/page.tsx`, `src/components/studio/import-code.tsx`.

- [ ] Studio Fit: choose a client (select of Supabase clients), then the same three steps under `/studio/fit?step=`; result saves to the studio store only.
- [ ] Tailor: pick a client held on this device; per field: draft value (in and cm), a tape input in inches, a "Verified" checkbox; "Save corrections" stores them on this device. Fields marked verified show source "tailor verified".
- [ ] Import: paste a code, choose the client; `decodeDraftCode` errors show "This code looks incomplete. Ask the customer to resend it."; success shows the decoded style, fit and bust, and saves with source `import`.
- [ ] Playwright `tests/studio.spec.ts` (memory backend, dev staff from env): wrong password message; sign in; a client registered through the gate appears with a working `wa.me` link; Orders lists only clients with a brief; Import rejects a mangled code and accepts a real one produced by the customer flow; Tailor saves a correction and shows it after reload; Delete removes the client; Sign out returns to login; axe on every studio route; one `h1` per route; no horizontal overflow at 390 and 1440.
- [ ] Commit "Add studio fit, tailor corrections and draft code import".

### Task 13: Try-on prompt, providers and the spike script

**Files:** `src/lib/fit/tryon-prompt.ts` (+test), `src/lib/fit/server/tryon-provider.ts` (+test with a recorded Gemini response fixture), `scripts/fit-tryon-spike.mjs`, `docs/FIT-SPIKE-REPORT.md`, `.gitignore` (`.fit-spike/`).

**Interfaces:** `TRYON_PROMPT_VERSION = 'tryon-2026-10-03'`; `buildTryOnPrompt(look: Look): string`; `interface TryOnProvider { tryOn(i: {person: Blob; garment: Blob; lookSlug: string}): Promise<{image: Blob; model: string; promptVersion: string}> }`; `createGeminiProvider({apiKey, model, fetch?, timeoutMs = 45000})` posting to `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` with header `x-goog-api-key`, parts `[text, inline_data person, inline_data garment]`, `generationConfig.responseModalities: ['IMAGE']`, reading `candidates[0].content.parts[].inlineData ?? inline_data`; `TryOnError` with `code: 'timeout' | 'vendor' | 'no-image' | 'blocked'`; `createFakeProvider()` returns the garment image (dev and Playwright only).
- [ ] Tests: prompt includes every spec 4.6 requirement (face, skin tone, body shape, proportions, pose, background unchanged; only clothing replaced; embroidery placement, colour, sheer dupatta kept; no beautifying or slimming; one photorealistic image) and the look name, no dashes; provider sends the key only in the header (never the URL), parses camelCase and snake_case responses, maps `promptFeedback.blockReason` to `blocked`, a response without image to `no-image`, HTTP 500 to `vendor`, abort to `timeout`; error messages never contain base64 data.
- [ ] Spike script: `node scripts/fit-tryon-spike.mjs --person path.jpg` requires `GEMINI_API_KEY` and `GEMINI_PAID_TIER_CONFIRMED=true`, runs `gemini-3.1-flash-image` and `gemini-3-pro-image` on the three looks, writes images to `.fit-spike/` (gitignored), and prints the scoring table to paste into the report. The report template lists the five criteria and the go or no-go bar (every look scores at least 4 of 5 on both "dupatta preserved" and "person unchanged").
- [ ] Commit "Add the try-on prompt, Gemini provider and the spike kit".

### Task 14: Try-on server routes

**Files:** `src/lib/fit/server/tryon.ts` (+test), `src/app/api/fit/try-on/route.ts`, `src/app/api/fit/try-on/report/route.ts`.

**Interfaces:** `handleTryOn(deps: {config; store; secret; provider; loadGarment(slug): Promise<Blob | null>; staff(): Promise<{id} | null>; today(): string}, form: FormData, contentLength: number | null): Promise<{status: number; json?: object; image?: Blob}>`; `handleReport(...)`. Responses: 503 `{error: 'unavailable'}`; 413 `too-large`; 415 `type`; 400 `look`; 401 `invalid-token`; 429 `cap` with `{whatsapp: url}`; 502 `vendor` / 504 `timeout`; 200 with the image bytes and `x-tryon-model`, `x-tryon-prompt`, `cache-control: no-store`. `GET /api/fit/try-on` → `{available}`.
- [ ] Tests: unavailable when config says so (paid flag); content-length over 8 MB refused before parsing; GIF refused; unknown slug refused; bad token refused; staff session accepted with the studio cap and key `staff:<id>`; at 5 used the call succeeds and the count becomes 6; at 6 used refused; provider failure leaves the count unchanged; report bumps `reports` only; privacy: with `console` spied across every path, nothing logged contains image bytes, the token, or measurement words.
- [ ] Commit "Add the try-on and report routes with daily caps".

### Task 15: Try-on UI

**Files:** `src/lib/fit/image.ts`, `src/components/fit/look-picker.tsx`, `try-on-preview.tsx`, `try-on-flow.tsx`, `src/app/fit/try-on/page.tsx`, `src/lib/enquiries/messages.ts` (`composeTryOnOrder` + test), `step-result.tsx` ("Try it on" link only when available).

- [ ] `composeTryOnOrder({name, look, choice: 'size' | 'mtm', size?, styleId?})` test: names the look, says the preview was AI, no measurements unless a draft code is passed, no dashes.
- [ ] Page: when try-on is unavailable, the page explains and offers WhatsApp (no form). Otherwise: choose a look (three catalogue looks, full silhouette images), add a photo (camera or upload, downscaled to 1600px), "Make my preview"; result with the persistent label "AI preview, not a photograph of the garment", "Report this preview", "Try another look", "I like this" then "Ready size" or "Made to measure", then "Order on WhatsApp". Cap message: "You've used today's previews. Message us on WhatsApp and we'll help." Error: retry, allowance kept.
- [ ] Playwright `tests/tryon.spec.ts` (memory backend, fake provider): full journey to the WhatsApp link; label always visible with the image; report shows a thank-you; cap reached after the configured cap (set `FIT_TRYON_DAILY_CAP=2` in the test server env) shows the cap message; axe.
- [ ] Commit "Add the try-on flow".

### Task 16: Environment, docs and the full verification

**Files:** `.env.example`, `playwright.config.ts`, `README.md` (a short "Find your fit backend" section), `docs/superpowers/plans/*` checkboxes.

- [ ] `npm test`, `npm run test:db`, `npm run typecheck`, `npm run lint`, `npm run build` (with backend off and with memory), `npm run test:ui` all pass. Screenshots of `/fit/start`, `/studio`, `/fit/try-on` at 390, 430 and 1440 reviewed against the design notes. `grep -rn "—\|–"` over new customer-facing files returns nothing.
- [ ] Fresh reviewer over the whole branch; fix confirmed findings.
- [ ] Commit "Document the Find your fit backend settings".

## Needs from the client (cannot be done in code)

1. Supabase project (or approval to create one through the Vercel Marketplace), then apply the migration and set the four env vars on Vercel.
2. Studio staff email addresses (create the users in Supabase Auth and insert into `studio_staff`).
3. Confirmation of the consent wording.
4. A billing-enabled Google AI project and `GEMINI_API_KEY`, plus one consenting test person, to run the spike. Only after it passes: `FIT_TRYON_ENABLED=true`, `GEMINI_PAID_TIER_CONFIRMED=true`, `GEMINI_IMAGE_MODEL`.
5. The nine "Decisions for the client" from part 1.

## Self-review notes

- **Spec coverage.** 4.1 routes: `/fit/start` (8), `/fit/try-on` (15), redirects (7, 8), studio routes (10 to 12). 4.2 placement: schema has no measurement columns (1), studio measures device-only (11, 12). 4.3 schema and RLS (1). 4.4 token (3, 6). 4.5 server boundary: `registerFitClient` (6), `updatePreference` (6), try-on and report routes (14), size, type, cap, staff cap, timeout (13, 14). 4.6 Gemini, paid flag, prompt (3, 13). 4.7 `phone.ts` (2), `tryon-prompt.ts` (13), `device-store` keys (7, 11). 4.8 components: `PhoneField`, `ConsentGate` (8), `LookPicker`, `TryOnPreview` (15), `StudioNav` (10), `ClientList` (11), `ImportCode`, `TailorCompare` (12). Section 5 copy (2, 9, 15). Section 6 errors: every row maps to tasks 6, 8, 12, 14, 15. Section 7 tests: unit (2 to 7, 10, 11, 13, 14), RLS (1), Gemini mocked (13), Playwright (8, 12, 15), privacy check (14). Section 8 spike gate: 13, and try-on stays off by default.
- **Deliberate departure.** The memory backend exists so the whole journey can be tested without the client's keys; it cannot run in production. With no Supabase configured the live site keeps part 1 behaviour instead of blocking customers at a gate that cannot save.
