# CSP Phase B — narrowing `'unsafe-inline'` (scoping)

**Area:** `specs/security/`
**Status:** scoping only — implementation deferred to a dedicated PR.
**Last updated:** 2026-05-20
**Predecessor:** E39 Phase A (PR #62, merged 2026-05-19) — added
`report-uri /api/csp-report` so every inline source becomes observable
without blocking. Phase B narrows the policy itself.

---

## Why this is multi-day

`public/_headers` ships:

```
script-src 'self' 'unsafe-inline' https://js.stripe.com … ;
style-src  'self' 'unsafe-inline' ;
```

`'unsafe-inline'` covers four distinct inline sources today:

1. **TanStack Start hydration scripts** — emitted into the SSR'd HTML
   by the framework, content varies per route + per build.
2. **JSON-LD blocks** — every legal/marketing page (`/privacy`,
   `/cookies`, `/about`, `/manage-support`, `/`) emits a
   `<script type="application/ld+json">` from `head()`. Static per
   route but distinct per route.
3. **GTM / GA bootstraps** — the consent-gated analytics loader writes
   small inline shims (`window.dataLayer=window.dataLayer||[]`).
4. **Stripe / Turnstile init** — third-party loaders sometimes drop
   inline init blocks that we don't fully control.

Each source needs a different narrowing strategy. Picking the wrong
one breaks production hydration (white screen) or marketing pixels.

## Two viable strategies

### Strategy A — hash-based, build-time

1. Post-build script walks every HTML emitted to `dist/`, extracts each
   inline `<script>` and `<style>` block, computes SHA-256, base64s it.
2. Concatenates the hash set into a generated `_headers` file:
   `script-src 'self' 'sha256-AAAA…' 'sha256-BBBB…' … ;`
3. Tests/security/headers-contract.ts already lock the CSP shape — the
   new file needs both an "expected static directives" check AND a
   "hash set is non-empty" check.

**Pros:** no runtime cost; works with CF Pages static serving; no
middleware needed.

**Cons:** every inline-block edit (new route, JSON-LD tweak, GA
loader rev) regenerates a new hash. Stripe / Turnstile inline blocks
ship from third-party CDNs we don't control — those would need to
become `nonce`s OR be loaded from `https://...` only (no inline).

### Strategy B — nonce-based, runtime middleware

1. Move HTML responses through a Cloudflare Pages Function (the
   tricky part — CF Pages serves static assets directly; you have to
   register `/*` as a function to intercept them, which costs latency).
2. Middleware generates a per-request nonce (e.g.
   `crypto.randomUUID()`).
3. Uses CF's `HTMLRewriter` to stamp `nonce="…"` on every
   `<script>` and `<style>` in the response body.
4. Sets `Content-Security-Policy: script-src 'self' 'nonce-…' …` on
   the same response, replacing the static `_headers` policy for
   that path.

**Pros:** dynamic — handles all four inline sources uniformly.

**Cons:** ~5–15ms latency added to every HTML response. CF Pages
static-asset routing semantics: a `_middleware.ts` at the project
root intercepts everything including static assets, which means even
`/favicon.ico` goes through the function — needs careful exclusion
list. Also breaks if the SSR worker emits the HTML directly (the
TanStack Start setup may bypass the static path).

## Recommendation for the next PR

**Hybrid: Strategy A for hydration + JSON-LD, Strategy B in
emergencies only.**

1. Land a post-build hash-extraction script
   (`scripts/build/extract-csp-hashes.mjs`). It writes
   `dist/_headers` from a template + the extracted hashes. The repo's
   `public/_headers` becomes a *template* with a sentinel like
   `__INLINE_SCRIPT_HASHES__` that the script replaces.
2. Update `tests/security/headers-contract.ts` to assert the template
   has the sentinel AND that the post-build artifact has ≥1 hash.
3. Move Stripe / Turnstile / GTM inline shims into proper `.js`
   modules served from `'self'` so they never need a nonce/hash.
4. Drop `'unsafe-inline'` from `script-src` *only*. Leave
   `style-src 'unsafe-inline'` — Radix + Tailwind v4 emit dynamic
   inline styles that hash-based CSP can't reasonably cover. ZAP rule
   10055 already grades style-src wildcards as informational.

This staged plan ships value (script-src tightened) without forcing
the full HTMLRewriter middleware build-out yet.

## Out of scope for the next PR

- Narrowing `style-src` — defer to a separate Phase C once Tailwind v4
  CSS-first config matures.
- Per-route CSP (CF Pages supports `_headers` path-prefix overrides
  but each route would need its own hash set — pointless complexity
  before Phase B is even green).
- Subresource Integrity (SRI) on `<script src="…">` — orthogonal hardening.

## Definition of done (for the FUTURE PR)

1. Post-build script generates `dist/_headers` with
   `script-src 'self' 'sha256-…' 'sha256-…' …` and no
   `'unsafe-inline'`.
2. `tests/security/headers-contract.ts` asserts the artifact shape AND
   that `'unsafe-inline'` is absent from `script-src`.
3. Cloudflare Pages preview deploy serves the new header — confirmed
   via the live header test
   (`e2e/specs/security/headers-live.spec.ts`).
4. ZAP baseline run after deploy: rule 10038 stays at 0 findings; no
   new inline-violation reports in the `/api/csp-report` log over a
   24h window.
5. CHANGELOG entry under `[Changed]` referencing Phase A's
   `report-uri`.

## Carry-overs from Phase A

- `report-uri /api/csp-report` stays — Phase B narrows the policy but
  keeps the reporter so any regression surfaces in CF Pages logs.
- E39 Phase A's zod boundary on respondent RPCs is the input-side
  belt; Phase B is the script-side belt. Both need to be in place to
  call the E39 epic closed.
