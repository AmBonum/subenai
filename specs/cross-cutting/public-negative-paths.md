# Public-surface negative paths (donations, contact, DPA, DSR, blog 404s)

Source: 2026-06-12 negative-coverage audit. Goal: every public flow's
failure path is exercised at the UI level — wrong states, API 4xx/5xx,
network aborts — with the user-visible reaction asserted verbatim.

Environment: ALL test cases run against vite :8080 (`--project=e2e-chromium`).
`/api/*` calls are stubbed with `page.route` (re-registering a route
supersedes the previous one — that is the retry mechanism). No wrangler.
Locators: POM-only (CLAUDE.md). When a component lacks a `data-testid` the
test needs, ADD it to the source component in the same change.

IMPORTANT — bug-hunting contract: before writing each TC, read the source
component and extract the EXACT Slovak copy / state rendering. If a failure
path renders NOTHING user-visible (silent catch, no alert/toast), do NOT
write a test asserting nothing — flag it in your final report as an app bug
with file:line. If the fix is a one-liner consistent with existing patterns
(inline `role="alert"` paragraph like `respondent-flow-submit-error`, or a
sonner toast wrapped in a testid span like `toast-export-csv-error`), apply
it and test the new behavior.

---

## A. Donation thank-you page (/thank-you/<sessionId>)

Source: src/routes/thank-you.$sessionId.lazy.tsx (polls
`GET /api/donation-status?session_id=...` every 3s up to 30s; states:
loading/pending → ready | unpaid | timeout | not_found | error).
Stub `**/api/donation-status*`.

**PUB-01 — not_found session renders the NotFoundState.**
Stub → 404 `{"status":"not_found"}`. Open /thank-you/cs_test_x. Assert the
not-found state copy (read NotFoundState in the route for verbatim text +
add testid if missing).

**PUB-02 — unpaid session renders the UnpaidState.**
Stub → 200 `{"status":"unpaid","is_subscription":false,"has_customer":false}`.
Assert unpaid copy.

**PUB-03 — network/server error renders the terminal ErrorState (no retry loop).**
Stub → 500. Assert error-state copy appears (and does not flip back to
pending).

**PUB-04 — pending never resolving reaches the TimeoutState.**
Stub → 200 `{"status":"pending"}` permanently. The poller gives up after
POLL_MAX_MS — read the constant; if it is too long for a test, drive it via
`page.clock` (Playwright clock API) or assert the pending state + skip the
timeout transition with a documented reason. Prefer page.clock.

**PUB-05 — subscription portal button failure shows the alert with the error code and contact e-mail.**
Stub donation-status → ready subscription payload (mirror DonationStatusBody;
`is_subscription: true` + donation row). Stub `POST **/api/customer-portal`
→ 403 `{"error":"session_expired"}`. Click the manage button → assert the
`role=alert` paragraph contains the code `session_expired` and the contact
e-mail link. Re-stub → 200 `{"url":"https://billing.stripe.com/p/x"}` —
do NOT click again (navigation would leave the app); instead assert the
button is re-enabled after the failure.

## B. Public contact form (/contact-form)

Source: src/routes/contact-form.index.tsx + the component it renders
(grep SupportContactForm / its submit → `POST **/api/support-ticket-create`).
Read the component first for its error code → Slovak copy mapping and
existing testids (tests/components/SupportContactForm.test.tsx may document
them).

**PUB-06 — submit 500 shows the form error, inputs keep their values, retry succeeds.**
Fill valid name/e-mail/subject/body (+ whatever consent/turnstile the form
needs — check how existing specs stub Turnstile). Stub → 500. Submit →
assert error copy verbatim; assert inputs retain values. Re-stub → success
body (mirror the function's 200 response) → submit → success state.

**PUB-07 — 429 rate_limited shows the rate-limit specific copy.**
Stub → 429 `{"error":"rate_limited"}` → assert the mapped copy (verbatim
from the component; if the component shows the same generic copy for 429,
assert that and note it).

**PUB-08 — network abort shows the offline/connection copy.**
`route.abort("connectionrefused")` → assert mapped copy.

## C. Schools DPA form (/schools — DPA request)

Source: src/components/schools/SchoolsDpaForm.tsx (submits
`POST **/api/dpa-request`; multiple catch blocks at lines ~72/131/197/215 —
read them, map each to its rendered state).

**PUB-09 — dpa-request 500 shows the failure state with retry.**
Fill the form (read required fields), stub → 500 → assert error rendering
verbatim. Re-stub → 200 success body (mirror functions/api/dpa-request.ts
response) → retry → success state.

**PUB-10 — network abort path.**
`route.abort()` → assert the catch-path rendering (line ~215). If that
catch renders nothing → app bug per the contract above.

## D. DSR form (public /privacy + /app/legal/dsr share DsrSubmitForm)

Source: src/components/user/DsrSubmitForm.tsx — read the submit target
(supabase table insert or /api/* ?) and error rendering.

**PUB-11 — DSR submit failure shows the error and preserves the e-mail.**
Use the public /privacy surface (no auth). Fail the submit (mockSupabase
`errors` for the table/RPC, or page.route if it's an /api call) → assert
error copy; fix-and-retry → success copy.

## E. Blog + share-page 404s

**PUB-12 — unknown /s/<slug> renders the not-found state, not a blank page.**
Open /s/neexistujuci-slug with mockSupabase serving empty cms/blog tables
(read src/routes/s.$slug.tsx for what it queries). Assert the 404/empty
state element (add testid if missing) and that the header/nav still render.

**PUB-13 — unknown blog post slug renders the post-not-found state.**
Open /blog/neexistujuci-clanok with empty blog_posts. Assert not-found copy
+ a link back to /blog.

---

Definition of done: spec at `e2e/specs/cross-cutting/public-negative-paths.spec.ts`
(describe block per section), POMs under e2e/poms/** extended (no
page.locator/getByTestId in the spec body), every TC green against vite
:8080, `npx eslint --fix` on touched files ends 0/0. Final report MUST list
any silent-failure app bugs found (file:line + what the user sees).
