# /support donate flow — test plan

**Area:** `specs/sponsorship/`
**Component(s) under test:** `src/routes/support.tsx` (`DonateForm`), `src/routes/thank-you.$sessionId.tsx` (`ThankYouView`), `src/routes/manage-support.tsx` (`ManageSupportForm`), `functions/api/create-checkout-session.ts`, `functions/api/stripe-webhook.ts`, `functions/api/donation-status.ts`
**Routes:** `/support`, `/thank-you/$sessionId`, `/manage-support`
**API endpoints:** `POST /api/create-checkout-session`, `GET /api/donation-status?session_id=`, `POST /api/stripe-webhook`
**Data dependencies:** `sponsors`, `donations`, `subscriptions` tables; `public_sponsors`, `footer_sponsors` views; Stripe Checkout Sessions + Stripe CLI webhook forwarding; `.dev.vars` env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
**Source stories:** `tasks/stories/E11.1-podpora-page.md` (AC-1 through AC-13), `tasks/stories/E10.3-stripe-webhook-function.md` (AC-1 through AC-10), `tasks/stories/E10.2-sponsors-schema.md` (AC-1 through AC-7)
**Last updated:** 2026-05-16

---

## Context

The `/support` donate page is the primary revenue surface for the subenai project (Epic E11). A visitor who wishes to support the project picks a frequency (one-off or monthly subscription), selects or enters an amount, provides billing details and two mandatory legal consents, and optionally opts into the public `/sponsors` sponsor list with a display name, link, and short message. After submitting the form, the browser is redirected to Stripe-hosted Checkout, which handles card collection and SCA natively. On success, Stripe redirects back to `/thank-you/{session_id}`, which polls `/api/donation-status` until the webhook has written the `sponsors` and `donations` rows, then renders a personalised thank-you view. This plan covers the full browser-visible round-trip against real Stripe test mode — no mocks on the API layer.

## Environment contract

All TCs in this plan share the following environment unless a TC overrides it:

- **BASE_URL:** `http://localhost:8788` (wrangler pages dev — serves both the app and `/api/*`; Vite-only port 8080 does not serve the CF functions).
- **Stripe test mode:** `STRIPE_SECRET_KEY=sk_test_…` in `.dev.vars`. Real Stripe Checkout hosted at `https://checkout.stripe.com/c/pay/cs_test_…`.
- **Stripe CLI forwarding:** `stripe listen --forward-to http://localhost:8788/api/stripe-webhook` running in background; webhook signing secret exported as `STRIPE_WEBHOOK_SECRET` in `.dev.vars`.
- **Default test card (no SCA):** number `4242 4242 4242 4242`, expiry `12 / 34`, CVC `123`, ZIP `94110`.
- **SCA challenge card:** `4000 0027 6000 3184` (3DS required).
- **Viewport:** 1280×800 unless stated otherwise.
- **Cookie/session state:** no prior cookies unless a TC states otherwise.

## Out of scope

- `/sponsors` page rendering of the newly-created sponsor — to be covered by `specs/sponsorship/sponsors-page.md` (does not exist yet).
- Customer portal magic-link end-to-end (Resend email delivery, portal session creation) — to be covered by a separate `specs/sponsorship/customer-portal-magic-link.md` plan.
- Raw DB row assertions on `sponsors`, `donations`, and `subscriptions` tables — covered by `e2e/integration/stripe/` and `e2e/integration/webhooks/` using the `request` fixture (not browser-level tests).
- Refund flow (`charge.refunded` webhook, negative donation row, ops email) — covered by `e2e/integration/webhooks/stripe-webhook-refund.spec.ts`.
- Stripe webhook signature verification (tampered body, stale timestamp) — to be covered by `e2e/integration/webhooks/stripe-webhook-signature.spec.ts` (does not exist yet).
- Server-side validation bypass via direct POST (curl/fetch without browser) — API integration concern, not a browser plan.
- AML guard enforcement at the webhook layer for amounts > 500 EUR — integration test concern.
- Payment method alternatives (Apple Pay, Google Pay, SEPA) — Stripe's own checkout handles these; their availability is environment-dependent and not asserted here.

---

## Happy paths

### TC-01: One-off 25 EUR donation, anonymous, completes Stripe Checkout and lands on ready thank-you view

**AC reference:** AC-3, AC-4, AC-7, AC-9, AC-10 (E11.1); AC-1, AC-2, AC-3 (E10.3)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Stripe CLI forwarding is active; `.dev.vars` contains valid `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- No prior form values; `cancelled` query param absent.

**When** the user clicks the "Jednorazovo" frequency button (already selected by default)
**and** clicks the preset chip labelled "25 €"
**and** fills the field labelled "E-mail" with `donor-tc01@example.com`
**and** fills the field labelled "Meno alebo firma" with `Test Donor`
**and** ticks the checkbox labelled "Súhlasím so začatím poskytovania okamžite a beriem na vedomie stratu práva na odstúpenie (§ 7 ods. 6 zákona č. 102/2014 Z. z.)."
**and** ticks the checkbox labelled "Beriem na vedomie spracovanie mojich osobných údajov per Zásady ochrany súkromia."
**and** clicks the submit button (labelled "Pokračovať na platbu — 25 €")
**Then** the browser is redirected to `https://checkout.stripe.com/c/pay/cs_test_…` (Stripe-hosted Checkout, locale `sk`)
**and** after the user fills card number `4242 4242 4242 4242`, expiry `12 / 34`, CVC `123` and clicks the pay button on the Stripe page
**and** Stripe redirects back to `http://localhost:8788/thank-you/cs_test_…`
**Then** the page initially renders the heading "Hľadáme tvoju platbu…" (PendingState)
**and** within 30 seconds the page transitions to the ReadyState heading "Ďakujeme za podporu!"
**and** the rendered kind label is "Jednorazová podpora" and the amount is "25.00 EUR"
**and** no sponsor display name appears (anonymous donation)

---

### TC-02: One-off 100 EUR donation with sponsor profile and footer opt-in

**AC reference:** AC-8, AC-9, AC-10 (E11.1); AC-1, AC-4 (E10.3); AC-1 (E10.2)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Stripe CLI forwarding active.

**When** the user selects the "Jednorazovo" mode and the "100 €" preset chip
**and** fills "E-mail" with `donor-tc02@example.com` and "Meno alebo firma" with `Acme s. r. o.`
**and** ticks both mandatory consents
**and** ticks the checkbox labelled "Chcem byť na zozname sponzorov (/sponsors)"
**and** fills "Zobrazované meno" with `Acme s. r. o.`
**and** fills "Odkaz (https://, voliteľné)" with `https://acme.example`
**and** enters the message "Podporujeme vzdelanost na Slovensku." in the textarea labelled "Krátka správa (voliteľné)"
**and** ticks the checkbox labelled "Zobraziť ma aj v päte stránky" (enabled because 100 EUR ≥ 50 EUR threshold)
**and** submits and completes Stripe Checkout with the default test card
**Then** the browser lands on `/thank-you/cs_test_…`
**and** after polling resolves to "ready", the heading reads "Ďakujeme, Acme s. r. o.!" (personalised greeting from `sponsor_display_name`)
**and** the kind label is "Jednorazová podpora" and the amount is "100.00 EUR"

---

### TC-03: Monthly 10 EUR/mes subscription completes and thank-you shows subscription rendering

**AC reference:** AC-3, AC-4, AC-9, AC-10 (E11.1); AC-2 (E10.3)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Stripe CLI forwarding active.

**When** the user clicks the "Mesačne" frequency button
**and** clicks the preset chip labelled "10 €"
**and** fills "E-mail" with `donor-tc03@example.com` and "Meno alebo firma" with `Monthly Donor`
**and** ticks both mandatory consents
**and** clicks the submit button (labelled "Pokračovať na platbu — 10 €/mes")
**and** completes Stripe Checkout with the default test card
**Then** the browser lands on `/thank-you/cs_test_…`
**and** after polling resolves to "ready", the kind label is "Mesačný odber" and the amount contains "/mes"
**and** a section with heading "Spravovať mesačný odber" is visible, containing a button labelled "Spravovať odber"

---

### TC-04: Custom one-off amount with comma decimal separator is accepted

**AC reference:** AC-4, AC-5 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Stripe CLI forwarding active.

**When** the user is in "Jednorazovo" mode and clicks the button labelled "Iná suma"
**and** types `17,50` into the input labelled "Vlastná suma (5–500 €)" (comma as decimal separator)
**and** fills "E-mail" with `donor-tc04@example.com` and "Meno alebo firma" with `Custom Donor`
**and** ticks both mandatory consents
**Then** the submit button label reads "Pokračovať na platbu — 17.5 €" (comma replaced by dot in `amountEur`)
**and** clicking submit and completing Stripe Checkout redirects back to `/thank-you/cs_test_…`
**and** after polling resolves to "ready", the rendered amount is "17.50 EUR"

---

## Negative scenarios

### TC-05: Submit button remains disabled until all required fields and consents are filled

**AC reference:** AC-5, AC-6, AC-7, AC-13 (E11.1); Risk "User submituje bez checkboxov → invalid state" (E11.1)

**Risk reference:** "User submituje bez checkboxov → invalid state"

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- All form fields at their initial empty/unchecked state.

**When** the user inspects the submit button before touching the form
**Then** the button is disabled (has `disabled` attribute and `disabled:opacity-50` styling)
**and** filling only "E-mail" (`donor@example.com`) and "Meno alebo firma" (`Test`) without selecting an amount leaves the button disabled
**and** selecting amount "25 €" without ticking both consents leaves the button disabled
**and** ticking only the first consent ("Súhlasím so začatím poskytovania okamžite…") while the second remains unchecked leaves the button disabled
**and** only after selecting an amount, filling email, filling name, and ticking both consents does the button become enabled

---

### TC-06: Cancelling from Stripe Checkout returns to /support with the cancellation banner

**AC reference:** AC-9 (E11.1)

**Prerequisites**:
- The user has submitted the form and been redirected to Stripe Checkout.
- Stripe Checkout `cancel_url` is configured as `http://localhost:8788/support?cancelled=1`.

**When** the user clicks "Back" or the cancel link on the Stripe Checkout page
**Then** the browser navigates to `http://localhost:8788/support?cancelled=1`
**and** a status banner with text "Platbu si zrušil. Žiadne údaje neboli uložené. Ak si to len rozmyslel, môžeš formulár vyplniť znova." is visible
**and** the donate form is rendered below the banner with all fields reset to initial empty state

---

### TC-07: Cancelled banner does not appear on a fresh /support visit

**AC reference:** AC-9 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support` (no `cancelled` query param).

**When** the page loads
**Then** the status banner containing "Platbu si zrušil." is NOT present in the DOM

---

### TC-08: display_link without https:// prefix blocks submission (client-side)

**AC reference:** AC-8 (E11.1); AC-1 (E10.2) — `sponsors_display_link_https` constraint

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Amount "25 €" selected, email and name filled, both consents ticked.
- "Chcem byť na zozname sponzorov (/sponsors)" checked.
- "Zobrazované meno" filled with `Test Donor`.

**When** the user types `http://insecure.example` into the "Odkaz (https://, voliteľné)" field
**Then** the hint text "Odkaz musí začínať https://" is visible
**and** the submit button is disabled (`linkValid` is false because the value does not start with `https://`)
**and** no POST is sent to `/api/create-checkout-session`

---

### TC-09: display_message over 80 characters is capped by the textarea maxLength

**AC reference:** AC-8 (E11.1); AC-1 (E10.2) — `sponsors_display_message_len` constraint

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- "Chcem byť na zozname sponzorov (/sponsors)" checked.

**When** the user pastes an 85-character string into the "Krátka správa (voliteľné)" textarea
**Then** the textarea truncates the input to exactly 80 characters (via `maxLength={80}` and `slice(0, 80)`)
**and** the counter reads "0 znakov zostáva"
**and** the submit button is NOT blocked by `messageValid` (the slice guarantees the stored value is ≤ 80 chars)

---

### TC-10: "Zobraziť ma v päte stránky" checkbox is disabled when the amount does not qualify

**AC reference:** AC-8 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- "Chcem byť na zozname sponzorov (/sponsors)" ticked.

**When** the user selects a one-off amount of "10 €" (below the 50 EUR footer threshold)
**Then** the checkbox labelled "Zobraziť ma v päte (potrebné: jednorazovo ≥ 50 € alebo mesačne ≥ 25 €)" is rendered disabled
**and** it cannot be checked
**and** switching to monthly mode and selecting "10 €" (below the 25 EUR monthly threshold) also leaves it disabled
**and** switching to monthly mode and selecting "25 €" replaces the label with "Zobraziť ma aj v päte stránky" and the checkbox becomes enabled

---

## Edge cases

### TC-11: AML cap — one-off amount 501 EUR is blocked at the client

**AC reference:** AC-5 (E11.1); AC-4 (E10.3)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- "Iná suma" button clicked; custom amount input visible.

**When** the user types `501` into the custom amount input (labelled "Vlastná suma (5–500 €)")
**Then** `amountValid` is false (501 > MAX_ONEOFF = 500)
**and** the submit button is disabled
**and** the input renders with `aria-invalid="true"`
**and** no POST is sent to `/api/create-checkout-session`

---

### TC-12: SCA 3DS challenge card completes authentication and lands on thank-you

**AC reference:** AC-9, AC-10 (E11.1); Risk "Stripe SCA challenge zlyhá → strata platby" (E11.1)

**Risk reference:** "Stripe SCA challenge zlyhá → strata platby"

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Stripe CLI forwarding active.
- SCA test card ready: `4000 0027 6000 3184`.

**When** the user fills the form with amount "25 €", a valid email, name, and both consents
**and** submits and is redirected to Stripe Checkout
**and** enters card `4000 0027 6000 3184`, expiry `12 / 34`, CVC `123`
**and** the Stripe Checkout page presents the 3DS authentication challenge (a modal with a "Complete authentication" button)
**and** the user clicks "Complete authentication"
**Then** Stripe completes the payment and redirects to `http://localhost:8788/thank-you/cs_test_…`
**and** after polling resolves, the heading "Ďakujeme za podporu!" is visible

---

### TC-13: Refreshing /thank-you mid-poll restarts polling from loading state

**AC reference:** AC-10 (E11.1)

**Prerequisites**:
- The browser has just landed on `/thank-you/cs_test_<validId>` and the page is in "loading" or "pending" state (webhook has not arrived yet or is being delayed).

**When** the user presses the browser refresh button while the heading "Hľadáme tvoju platbu…" is visible
**Then** the page mounts again with `status = "loading"`
**and** the `ThankYouView` `useEffect` starts a new polling cycle from scratch
**and** if the webhook has completed in the meantime, the next poll returns `status: "ready"` and the ReadyState renders

---

### TC-14: Navigating to /thank-you with a syntactically invalid session ID yields not_found UI

**AC reference:** AC-10 (E11.1)

**Prerequisites**:
- Browser navigates to `http://localhost:8788/thank-you/cs_test_INVALID_ID_THAT_DOES_NOT_EXIST`.
- `/api/donation-status` endpoint validates that `session_id` starts with `cs_` (the value does start with `cs_test_` so passes the prefix check, length < 200).

**When** the page loads and begins polling `/api/donation-status?session_id=cs_test_INVALID_ID_THAT_DOES_NOT_EXIST`
**and** Stripe returns a `ResourceMissing` error (session not found) causing the endpoint to respond 404
**Then** the page renders the heading "Neznáma platba"
**and** the copy reads "Tento odkaz nezodpovedá žiadnej platbe v našom systéme." with a contact email link

---

### TC-15: Poll timeout after 30 seconds renders TimeoutState

**AC reference:** AC-10 (E11.1)

**Prerequisites**:
- Browser at `/thank-you/cs_test_<id>` where the Stripe CLI is NOT forwarding (webhook never arrives).
- Playwright mocks `/api/donation-status` to always return `{ status: "pending" }`.
- `POLL_MAX_MS = 30000` and `POLL_INTERVAL_MS = 3000` (from source).

**When** 30 seconds elapse with every poll response being `{ status: "pending" }`
**Then** the component sets `status = "timeout"` and renders the heading "Stále spracúvame…"
**and** the copy includes "Stripe nám ešte neposlal potvrdenie." and the contact email

---

### TC-16: Mobile viewport (375×812) — donate form is fully usable

**AC reference:** AC-11, AC-12 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 375×812.

**When** the page loads at mobile width
**Then** `document.documentElement.scrollWidth` is ≤ 375 (no horizontal overflow)
**and** the frequency radio group (two buttons side-by-side in a `grid-cols-2`) is visible without clipping
**and** all preset amount chips wrap naturally without overflow
**and** the email, name, and consent fields are all reachable by vertical scroll
**and** the submit button is full-width and its label is readable at this viewport

---

### TC-17: Keyboard-only navigation through the donate form (a11y)

**AC reference:** AC-12 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- No pointer device interaction; keyboard only.

**When** the user tabs to the "Jednorazovo" radio button and presses `Space` to confirm it (already selected)
**and** tabs to the "25 €" amount chip and presses `Space` or `Enter` to select it
**and** tabs to the "E-mail" input and types a valid email
**and** tabs to "Meno alebo firma" and types a valid name
**and** tabs to both consent checkboxes and presses `Space` to tick each
**and** tabs to the submit button and presses `Enter`
**Then** the form submits and the browser redirects to Stripe Checkout (focus moves to the Stripe domain)
**and** every interactive element in the form was reachable without a pointer device
**and** the tab order follows document order (frequency → amounts → email → name → DIČ → sponsor section toggle → consents → submit)

---

### TC-18: Slovak diacritics in meno and display_name round-trip through Stripe metadata

**AC reference:** AC-8 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Stripe CLI forwarding active.

**When** the user fills "Meno alebo firma" with `Ľubomír Ďurčiak`
**and** ticks "Chcem byť na zozname sponzorov (/sponsors)"
**and** fills "Zobrazované meno" with `Ľubomír Ďurčiak`
**and** selects amount "50 €", fills a valid email, ticks both consents, submits, and completes Stripe Checkout with the default test card
**Then** after polling resolves, the thank-you heading reads "Ďakujeme, Ľubomír Ďurčiak!" (diacritics preserved through the Stripe metadata → webhook → DB → polling round-trip)

---

### TC-19: Two browser contexts submitting the same email concurrently get independent sessions

**AC reference:** AC-9, AC-10 (E11.1); AC-3 (E10.3) — idempotency via `stripe_payment_intent_id`

**Risk reference:** "Stripe SCA challenge zlyhá → strata platby"

**Prerequisites**:
- Two Playwright browser contexts (Context A and Context B) open `http://localhost:8788/support` simultaneously.
- Both use the same email `donor-shared@example.com` and amount "25 €".
- Stripe CLI forwarding active.

**When** both contexts fill out the form identically and submit at approximately the same time
**and** each completes Stripe Checkout in their respective context
**Then** each context lands on a distinct `/thank-you/cs_test_…` URL (different Checkout session IDs)
**and** after polling resolves in both contexts, each shows "Ďakujeme za podporu!" independently
**and** `findOrCreateCustomer` reuses the same Stripe customer ID for both (email deduplication), but creates two separate Checkout Sessions and two separate `donations` rows

---

### TC-20: /support page title and meta tags match the E11.1 AC-1 spec

**AC reference:** AC-1, AC-2 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.

**When** the page loads
**Then** `document.title` equals `"Podpora projektu — subenai"`
**and** the `<meta name="description">` content contains `"jednorazovo alebo mesačne"`
**and** the page `<h1>` reads `"Podpora projektu"` and is visible
**and** the hero paragraph contains the text `"Akúkoľvek čiastku použijeme na hosting, tvorbu obsahu a údržbu."` (confirming the "Prečo podporiť" AC-2 hero copy)
**and** a `<link rel="canonical">` with `href` ending in `/support` is present in `<head>`

---

### TC-21: No dark patterns — no preset amount selected on load; all amounts equally prominent

**AC reference:** AC-13 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.

**When** the page loads without any URL parameter pre-selecting an amount
**Then** all preset chips (5 €, 10 €, 25 €, 50 €, 100 €) have `aria-checked="false"` and no chip carries the `bg-primary/10` selected styling
**and** the submit button is disabled (no amount selected)
**and** the "5 €" chip and the "100 €" chip have visually equivalent styling (same border, same font weight, no visual prominence difference between small and large amounts)

---

### TC-22: /api/donation-status returns 400 for a session_id that does not start with "cs_"

**AC reference:** AC-10 (E11.1) — guards against invalid IDs reaching the Stripe API

**Prerequisites**:
- Direct GET to `http://localhost:8788/api/donation-status?session_id=pi_malformed`.

**When** the request is made
**Then** the server returns HTTP 400 with `{"error":"invalid_session_id"}` (the check `!sessionId.startsWith("cs_")` triggers)
**and** no Stripe API call is made (the guard is before the Stripe client construction)

---

### TC-23: Stripe Checkout locale is forced to Slovak

**AC reference:** AC-9, AC-11 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Stripe CLI forwarding active; developer tools network recording active.

**When** the user fills the form (25 €, valid email, name, both consents) and submits
**Then** the POST to `/api/create-checkout-session` returns `200` with a `url` field pointing to `https://checkout.stripe.com/…`
**and** the Stripe Checkout page renders with Slovak-language UI (the `locale: "sk"` param in `buildCheckoutSession` sets the Stripe session locale — confirmed by reading `create-checkout-session.ts` line 184)
**and** the custom submit message on the Stripe page contains the disclosure text set via `custom_text.submit.message` ("Stlačením potvrdzujete súhlas so začatím poskytovania okamžite…")

---

### TC-24: XSS-like string in display_name is stored verbatim (no script execution)

**AC reference:** AC-8 (E11.1)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- "Chcem byť na zozname sponzorov (/sponsors)" checked.
- Stripe CLI forwarding active.

**When** the user fills "Zobrazované meno" with `<script>alert(1)</script>`
**and** fills amount "25 €", valid email, name, both consents, submits, and completes Stripe Checkout
**Then** the POST body contains the string verbatim (no pre-sanitisation in the client)
**and** after polling resolves, the thank-you heading renders the string as escaped text ("Ďakujeme, `<script>alert(1)</script>`!") — React's JSX rendering escapes HTML, so no `alert` dialog fires
**and** no `alert` dialog or unhandled script execution appears in the browser console

---

## Open questions

- **Stripe Checkout locale confirmation.** `create-checkout-session.ts` (line 184) passes `locale: "sk"` in the session params. The test generator should use a longer timeout on the Stripe-hosted page and assert the UI is in Slovak (look for the pay button label or a Slovak string). The plan flags this because Stripe's locale may fall back to English if the account's default differs — needs verification against the real test account.
- **Stripe-hosted DOM resilience.** The Stripe Checkout page is third-party; its DOM structure can change without notice. The generator should use Playwright's `page.locator('[data-testid="card-number-input"]')` or the `[name="cardNumber"]` selector with an extended `timeout` (≥ 15 000 ms) and a retry wrapper. This is an implementation note for the generator, not a plan defect.
- **`/api/donation-status` poll race in TC-13.** The test simulates a mid-poll refresh; in CI, the timing window between the redirect landing and the refresh action may be <100 ms if the webhook is fast. The generator should use a Playwright `route` mock to delay `/api/donation-status` responses until the refresh is triggered, ensuring the race is reproducible.
- **TC-19 two-context concurrency.** Playwright's `browser.newContext()` shares no cookies or local storage but uses the same Stripe test account. Verify that `findOrCreateCustomer` email deduplication does not create a second Stripe customer for the same email when two sessions overlap — the current implementation does a `customers.list` → update or create, which is not atomic. A race could create duplicate customers. This is flagged as an open risk for E11 stabilisation.
- **Subscription `invoice.paid` timing.** For TC-03, Stripe sends `customer.subscription.created` synchronously but `invoice.paid` may arrive seconds later. The plan asserts the thank-you "ready" state which depends on the `invoice.paid` webhook. If the polling resolves from `checkout.session.completed` (which writes the sponsor but not the donation row), the test may see `status: "pending"` until `invoice.paid` fires. The generator should budget a 45-second `waitForFunction` timeout for TC-03.
- **`/api/donation-status` non-`cs_` guard (TC-22).** The guard is validated here as a standalone API test. If the generator has access to Playwright's `request` fixture (APIRequestContext), this TC is better placed in the integration test suite — but it is included here as a documentation reference.
