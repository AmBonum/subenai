# Post-AH-16 SK→EN URL redirects — test plan

**Area:** `specs/cross-cutting/`
**Component(s) under test:** `public/_redirects`
**Routes:** all 17 Slovak-path source URLs listed in `public/_redirects`
**API endpoints:** _None — HTTP 301 responses served by Cloudflare Pages infrastructure._
**Data dependencies:** _None — static redirect table; no DB read path._
**Source stories:** _None — pre-story feature. Intent inferred from `public/_redirects` and commit `4ba55d7` ("Premenovanie `/test/firma/*` → `/testy/*` …"). AH-16 is referenced as the URL-canonicalization milestone in `tasks/PLAN-2026-05-19-testing-coverage.md`._
**Last updated:** 2026-05-19

---

## Context

During AH-16, all public-facing Slovak-language URL paths (e.g. `/podpora`, `/sponzori`, `/skolenia`, `/testy`) were renamed to English equivalents (`/support`, `/sponsors`, `/courses`, `/tests`). To preserve inbound links from Google's index, social shares, and old email campaigns, a `public/_redirects` file was added with 17 permanent (301) redirect rules in Cloudflare Pages format. A broken redirect silently drops referral traffic and hurts SEO — this plan provides regression coverage for the most-trafficked route families.

**Important:** `_redirects` is processed by the Cloudflare Pages edge layer, not by TanStack Router or the Vite dev server. All TCs must run against the **wrangler dev server** at `http://localhost:8788` (started with `wrangler pages dev`), NOT against `http://localhost:8080` (Vite), because Vite does not evaluate `_redirects`.

## Out of scope

- Internal client-side navigation (TanStack Router `<Link>` components) — those are covered per-area in the relevant specs (`specs/sponsorship/`, `specs/courses/`, etc.).
- Redirect rules for paths not present in `public/_redirects` (e.g. query-string canonicalization, trailing-slash normalization).
- HTTPS→HTTP or www→apex canonicalization — handled by Cloudflare DNS settings, not `_redirects`.
- The content of the destination pages — each destination has its own area plan.
- Verifying `Cache-Control` or `Vary` headers on redirect responses.
- Redirect chains (no redirect in the file points to another redirected path).

---

## Happy paths

### TC-01: `/podpora` permanently redirects to `/support`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788` (`wrangler pages dev`).
- The request is issued with `maxRedirects: 0` so the redirect response itself is captured (no follow-through).

**When** the test fetches `http://localhost:8788/podpora` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/support`

### TC-02: `/sponzori` permanently redirects to `/sponsors`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/sponzori` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/sponsors`

### TC-03: `/zmeny` permanently redirects to `/changelog`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/zmeny` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/changelog`

### TC-04: Following a redirect end-to-end lands on the correct destination page

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Redirect-following is enabled (default browser behaviour).

**When** the browser navigates to `http://localhost:8788/podpora`
**Then** the final URL is `http://localhost:8788/support`
**and** the page title contains "Podpora projektu"

---

## Negative scenarios

### TC-05: Hitting the English target URL directly returns 200, not a second redirect

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/support` with redirect-following disabled
**Then** the HTTP response status is `200`
**and** no `Location` header is present in the response (the English path is the canonical destination, not itself a redirect source)

### TC-06: An unknown Slovak-looking path that is NOT in `_redirects` returns the app shell, not a redirect

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/neexistujuca-stranka` with redirect-following disabled
**Then** the HTTP response status is `200` (the Cloudflare Pages SPA fallback serves `index.html`)
**and** no `Location` header is present
**and** TanStack Router renders the 404 "not found" UI inside the app shell

### TC-07: `/spravovat-podporu` permanently redirects to `/manage-support`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/spravovat-podporu` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/manage-support`

---

## Edge cases

### TC-08: `/sponzori/vsetci` (sub-path, exact rule) redirects to `/sponsors/all`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.
- The file has both `/sponzori → /sponsors` and `/sponzori/vsetci → /sponsors/all`; this TC confirms the more-specific rule fires first.

**When** the test fetches `http://localhost:8788/sponzori/vsetci` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/sponsors/all` (not `/sponsors/vsetci`, which would indicate the wrong rule matched)

### TC-09: `/testy` permanently redirects to `/tests`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/testy` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/tests`

### TC-10: `/testy/eshop` (wildcard splat rule) redirects to `/tests/eshop`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.
- The rule `/testy/* → /tests/:splat 301` covers all sub-paths.

**When** the test fetches `http://localhost:8788/testy/eshop` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/tests/eshop` (the `:splat` placeholder is preserved verbatim)

### TC-11: `/test/firma` catch-all redirects to `/tests` (legacy composer slug)

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/test/firma` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/tests`

### TC-12: `/skolenia` and `/kurzy` both redirect to `/courses` (two aliases, same destination)

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Both requests issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/skolenia` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/courses`
**and** when the test fetches `http://localhost:8788/kurzy` with redirect-following disabled the response status is also `301` and the `Location` header also equals `/courses`

### TC-13: `/skolenia/sms-smishing` (wildcard) redirects to `/courses/sms-smishing`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.
- The rule `/skolenia/* → /courses/:splat 301` covers all sub-paths; same rule also appears as `/kurzy/*`.

**When** the test fetches `http://localhost:8788/skolenia/sms-smishing` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/courses/sms-smishing`

### TC-14: `/o-projekte` permanently redirects to `/about`

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/o-projekte` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/about`

### TC-15: `/kontakt` and `/skoly` redirect to their English equivalents

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Both requests issued with `maxRedirects: 0`.

**When** the test fetches `http://localhost:8788/kontakt` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/contact`
**and** when the test fetches `http://localhost:8788/skoly` with redirect-following disabled the response status is `301` and the `Location` header equals `/schools`

### TC-16: `/podakovanie/stripe-abc123` (wildcard thank-you) redirects preserving the splat

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- Request issued with `maxRedirects: 0`.
- The rule `/podakovanie/* → /thank-you/:splat 301` preserves the session ID that Stripe appends.

**When** the test fetches `http://localhost:8788/podakovanie/stripe-abc123` with redirect-following disabled
**Then** the HTTP response status is `301`
**and** the `Location` header equals `/thank-you/stripe-abc123` (the full splat is preserved, not truncated)

### TC-17: Response type is `301` (permanent), not `302` (temporary), for every rule

**Prerequisites**:
- Wrangler dev server running at `http://localhost:8788`.
- A representative sample of four rules is checked: `/podpora`, `/testy`, `/zmeny`, `/sponzori/vsetci`.

**When** each of the four paths is fetched with redirect-following disabled
**Then** every response has HTTP status `301` (not `302`, `303`, or `307`)
**and** search engines and browsers will cache the redirect permanently (this is the SEO-critical invariant of AH-16)

---

## Open questions

- Should the wrangler dev port (`8788`) be read from an environment variable or hardcoded in the spec? If the team changes the port via `wrangler.toml`, the spec's base URL must be updated.
- `/podakovanie/*` splat (TC-16) depends on a Stripe session ID that is real-only in production. The test uses a synthetic path component (`stripe-abc123`); confirm the Cloudflare Pages `_redirects` parser does not validate path segment format before substituting `:splat`.
- Are there additional redirect rules planned for AH-17 or later epics? This plan covers only the 17 rules present in `public/_redirects` as of 2026-05-19. New rules need a corresponding TC added before merging.
