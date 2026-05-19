# Sponsors pages — test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/sponsors.index.tsx`, `src/routes/sponsors.all.tsx`, `src/routes/sponsors.tsx`, `src/routes/manage-support.tsx`
**Routes:** `/sponsors`, `/sponsors/all`, `/manage-support`
**API endpoints:** `GET /rest/v1/public_sponsors` (anon, RLS-gated), `POST /api/portal-magic-link`
**Data dependencies:** `public_sponsors` Supabase view (opt-in rows only, no amounts, no emails); Cloudflare Turnstile (`VITE_TURNSTILE_SITE_KEY`); Stripe Customer Portal (external, not exercised in E2E tests — stub the CF Function)
**Source stories:** `tasks/stories/E11.3-sponzori-list.md`, `tasks/stories/E11.4-footer-cancel-flow.md`
**Last updated:** 2026-05-19

---

## Context

The sponsors area is a two-page public hall-of-fame (`/sponsors`, `/sponsors/all`) plus a self-service cancel flow (`/manage-support`). The `/sponsors` index shows the five most recent opt-in donors in an accordion and links to the full filterable list. `/sponsors/all` presents every opt-in donor in a card grid with name/date/message filters and a status dropdown. No payment amounts are ever displayed. `/manage-support` lets any visitor request a Stripe Customer Portal magic link by entering the e-mail address they donated with; the server always returns the same 200 response regardless of whether the customer exists (anti-enumeration, AC-3 in E11.4). All three routes are indexable. Together they cover E11.3 (AC-1 through AC-7) and E11.4 (AC-2 through AC-7).

## Out of scope

- Stripe Checkout / payment initiation — covered by `specs/sponsorship/`.
- Stripe Customer Portal UX after the magic link is followed — external Stripe product, outside test scope.
- E-mail delivery verification for the portal magic link — requires live SMTP inspection.
- Footer "Podporiť projekt" link correctness — covered by `specs/cross-cutting/`.
- Cookie banner interactions — covered by `specs/consent/`.
- Header mega-menu navigation — covered by `specs/cross-cutting/`.
- Monthly-subscriber badge ("Mesačný sponzor") — explicitly deferred in E11.3 status note; not in the current `public_sponsors` view schema.
- Sponsor self-service display-name change — deliberately manual-via-email in MVP (E11.3 risk table).
- Admin-side sponsor management (Supabase dashboard).
- Visual / pixel regression on card layout.

---

## Happy paths

### TC-01: /sponsors renders page heading, hero text, accordion list, and "Celý zoznam s filtrami" link

**AC reference:** AC-1, AC-2, AC-3, AC-5, AC-6 (E11.3)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session (no auth cookie, no prior consent cookie).
- Viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with a JSON body containing five sponsor records ordered newest-first: `[{ id: "s1", display_name: "Anna Novák", display_link: null, display_message: null, created_at: "2026-04-01T10:00:00Z", has_refund: false }, ...]`.
- Dev server running.

**When** the page finishes loading
**Then** `document.title` equals "Naši sponzori — subenai"
**and** the `<h1>` heading labelled "Naši sponzori" (`data-testid="sponzori-heading"` — see Open questions) is visible
**and** the hero paragraph contains the text "Vďaka týmto ľuďom funguje subenai"
**and** the accordion list region labelled "Najnovší sponzori" is visible and contains five accordion items
**and** the link labelled "Celý zoznam s filtrami" pointing to `/sponsors/all` is visible

### TC-02: /sponsors/all renders heading, filter controls, and the full card grid

**AC reference:** AC-3, AC-5, AC-6 (E11.3)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with three sponsor records.

**When** the page finishes loading
**Then** `document.title` equals "Všetci sponzori — subenai"
**and** the `<h1>` heading "Všetci sponzori" is visible
**and** the filters region labelled "Filtre" is visible and contains the search input (`data-testid="sponzori-vsetci-filter-name"`), "Od dátumu" date input (`data-testid="sponzori-vsetci-filter-date-from"`), "Do dátumu" date input (`data-testid="sponzori-vsetci-filter-date-to"`), and status select (`data-testid="sponzori-vsetci-filter-status"`)
**and** the card list contains three items
**and** the count status text reads "Zobrazených 3 (všetkých 3)"

### TC-03: /manage-support renders the email-request form in its default state

**AC reference:** AC-2, AC-3, AC-5 (E11.4)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty in the dev environment (Turnstile falls back to `"disabled"` token — component sets `turnstileToken = "disabled"` and does not block submission).

**When** the page finishes loading
**Then** `document.title` equals "Spravovať podporu — subenai"
**and** the `<h1>` heading "Spravovať podporu" is visible
**and** the email input (`<input type="email" id="email">`) is visible and empty
**and** the submit button labelled "Poslať odkaz na e-mail" is disabled (because the email field is empty)
**and** the anti-enumeration hint paragraph is visible with text beginning "Bezpečnostná poznámka:"

### TC-04: /manage-support — valid email + Turnstile bypass → submitted state shown after API 200

**AC reference:** AC-2, AC-3, AC-4 (E11.4)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty (Turnstile token auto-set to `"disabled"`).
- A `page.route` intercept on `**/api/portal-magic-link**` returns HTTP 200 with body `{}`.

**When** the user types `test@example.com` into the email input
**and** clicks the button labelled "Poslať odkaz na e-mail"
**Then** the form is replaced by the submitted confirmation section (`role="status"`)
**and** the heading "Skontroluj e-mail" is visible
**and** the confirmation paragraph contains the address `test@example.com` in a `<strong>` element
**and** the confirmation paragraph contains the text "1 hodinu"

---

## Negative scenarios

### TC-05: /sponsors — Supabase fetch failure shows error state

**AC reference:** AC-4 (E11.3, implied by empty/error states)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` aborts the request.

**When** the page finishes loading with the Supabase request aborted
**Then** an element with `role="alert"` is visible
**and** the alert text contains "Zoznam sa momentálne nepodarilo načítať. Skús stránku obnoviť za chvíľu."
**and** the accordion list and "Celý zoznam s filtrami" link are not rendered
**and** no unhandled JavaScript exception appears in the browser console

### TC-06: /sponsors — empty Supabase result shows empty state with /support CTA

**AC reference:** AC-4 (E11.3)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with body `[]`.

**When** the page finishes loading
**Then** the heading "Buď prvý" is visible
**and** the empty-state body text contains "Zatiaľ tu nikto nie je."
**and** the link labelled "Podporiť projekt" pointing to `/support` is visible
**and** the accordion list is not rendered

### TC-07: /sponsors/all — applying a name filter that matches nothing shows filtered empty state

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with one record (`display_name: "Anna Novák"`).

**When** the user types `zzz_no_match` into the search input (`data-testid="sponzori-vsetci-filter-name"`)
**Then** the card list disappears
**and** the text "Nič nezodpovedá filtru. Skús iné meno alebo rok." is visible
**and** the count status region is not shown

### TC-08: /manage-support — submit button remains disabled while email is syntactically invalid

**AC reference:** AC-5 (E11.4)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty.

**When** the user types `notanemail` into the email input
**Then** the submit button labelled "Poslať odkaz na e-mail" remains `disabled`
**and** no API request is made to `/api/portal-magic-link`

### TC-09: /manage-support — API 500 shows inline error and does not advance to submitted state

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty.
- A `page.route` intercept on `**/api/portal-magic-link**` returns HTTP 500 with body `{"error":"internal"}`.

**When** the user types `test@example.com` into the email input
**and** clicks the button labelled "Poslať odkaz na e-mail"
**Then** an element with `role="alert"` is visible
**and** the alert text contains the error code `internal`
**and** the alert text contains the contact email address (the `mailto:` link)
**and** the heading "Skontroluj e-mail" is NOT present (form not replaced by submitted state)

### TC-10: /manage-support — API 429 (rate limit) shows inline error

**AC reference:** AC-6 (E11.4)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty.
- A `page.route` intercept on `**/api/portal-magic-link**` returns HTTP 429 with body `{"error":"rate_limited"}`.

**When** the user types `test@example.com` into the email input
**and** clicks the button labelled "Poslať odkaz na e-mail"
**Then** an element with `role="alert"` is visible
**and** the alert contains the error code `rate_limited`
**and** the submitted state heading "Skontroluj e-mail" is NOT present

### TC-11: /manage-support — network failure shows network_error code inline

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty.
- A `page.route` intercept on `**/api/portal-magic-link**` aborts the request.

**When** the user types `test@example.com` into the email input
**and** clicks the button labelled "Poslať odkaz na e-mail"
**Then** an element with `role="alert"` is visible
**and** the alert contains the code `network_error`
**and** the submit button is re-enabled (no longer showing "Posielam…")

---

## Edge cases

### TC-12: /sponsors — robots meta is "index, follow" (not noindex)

**AC reference:** AC-6 (E11.3)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with body `[]`.

**When** the page finishes loading
**Then** `document.querySelector('meta[name="robots"]').content` equals `"index, follow"`
**and** `document.querySelector('link[rel="canonical"]').href` equals `"https://subenai.sk/sponsors"`

### TC-13: /sponsors/all — robots meta is "index, follow" and canonical points to /sponsors/all

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with body `[]`.

**When** the page finishes loading
**Then** `document.querySelector('meta[name="robots"]').content` equals `"index, follow"`
**and** `document.querySelector('link[rel="canonical"]').href` equals `"https://subenai.sk/sponsors/all"`

### TC-14: /sponsors — sponsor with has_refund=true renders "Vrátené" badge and strikethrough name

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with one record: `{ id: "r1", display_name: "Refunded Person", display_link: null, display_message: null, created_at: "2026-05-01T00:00:00Z", has_refund: true }`.

**When** the page finishes loading
**and** the user clicks the accordion item for "Refunded Person" to expand it
**Then** the badge element (`data-testid="sponzori-refund-badge"`) is visible with text "Vrátené"
**and** the sponsor name is rendered with a `line-through` CSS decoration (or the element has the class that applies it)
**and** the expanded accordion content contains the text "Príspevok bol vrátený na žiadosť prispievateľa."

### TC-15: /sponsors/all — "Vrátené" badge and strikethrough render in card grid

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with one record where `has_refund: true`, `display_name: "Refund Corp"`, `display_message: "Test message"`.

**When** the page finishes loading
**Then** the card for "Refund Corp" is visible
**and** the badge element (`data-testid="sponzori-vsetci-refund-badge"`) inside that card has text "Vrátené"
**and** the heading element for "Refund Corp" has a `line-through` style class
**and** the card contains the text "Príspevok bol vrátený na žiadosť prispievateľa."

### TC-16: /sponsors — sponsor with display_link renders an external link with rel="noopener noreferrer"

**AC reference:** AC-3 (E11.3)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with one record: `{ id: "l1", display_name: "Link Sponsor", display_link: "https://example.com", display_message: null, created_at: "2026-03-01T00:00:00Z", has_refund: false }`.

**When** the page finishes loading
**and** the user clicks the accordion item to expand "Link Sponsor"
**Then** an `<a>` element inside the expanded content has `href="https://example.com"`, `target="_blank"`, and `rel` containing both `"noopener"` and `"noreferrer"`
**and** the link's visible text is `"example.com"` (scheme stripped per component logic)

### TC-17: /sponsors/all — status filter "Prijaté" hides refunded records

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with two records: one `has_refund: false` (`display_name: "Active Sponsor"`) and one `has_refund: true` (`display_name: "Refund Sponsor"`).

**When** the user changes the status select (`data-testid="sponzori-vsetci-filter-status"`) to `"accepted"` (option labelled "Prijaté")
**Then** the card for "Active Sponsor" is visible
**and** the card for "Refund Sponsor" is not visible
**and** the count status text reads "Zobrazených 1 z 2"

### TC-18: /sponsors/all — date-range filter excludes records outside the range

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with two records: one `created_at: "2026-01-15T00:00:00Z"` (`display_name: "January Sponsor"`) and one `created_at: "2026-05-10T00:00:00Z"` (`display_name: "May Sponsor"`).

**When** the user sets "Od dátumu" (`data-testid="sponzori-vsetci-filter-date-from"`) to `2026-05-01`
**Then** only the card for "May Sponsor" is visible
**and** the card for "January Sponsor" is not visible
**and** the count status text reads "Zobrazených 1 z 2"

### TC-19: /manage-support — anti-enumeration: submit with non-existent email still shows success state

**AC reference:** AC-3 (E11.4)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty.
- A `page.route` intercept on `**/api/portal-magic-link**` returns HTTP 200 with body `{}` (server never reveals whether customer exists).

**When** the user types `nonexistent@example.com` into the email input
**and** clicks "Poslať odkaz na e-mail"
**Then** the submitted state section (role="status") is shown with heading "Skontroluj e-mail"
**and** the response body is NOT used to differentiate a "customer found" vs "not found" message — only the single success template is displayed

### TC-20: /manage-support — submit button shows "Posielam…" during the in-flight request

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty.
- A `page.route` intercept on `**/api/portal-magic-link**` introduces a 1 000 ms delay before returning HTTP 200.

**When** the user types `test@example.com` into the email input
**and** clicks "Poslať odkaz na e-mail"
**Then** the button text changes to "Posielam…" while the request is in-flight
**and** the button is `disabled` during that time (preventing double-submit)
**and** after the response arrives, the submitted state section is shown

### TC-21: /sponsors — footer note renders with mailto contact link

**AC reference:** AC-7 (E11.3)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with body `[]`.

**When** the page finishes loading
**Then** the footer note paragraph is visible and contains the text "Zoznam je dobrovoľný — mnohí sponzori si zvolili anonymitu"
**and** the paragraph contains a `mailto:` link pointing to the project contact email

### TC-22: Mobile viewport (375×667) — /sponsors accordion renders without horizontal overflow

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session.
- Viewport set to 375×667 (iPhone SE).
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with two sponsor records.

**When** the page finishes loading
**Then** the accordion list region is visible within the viewport
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal scroll)
**and** the "Celý zoznam s filtrami" link is visible and fully within the viewport width

### TC-23: Mobile viewport (375×667) — /manage-support form fields are fully usable

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session.
- Viewport 375×667.
- `VITE_TURNSTILE_SITE_KEY` is empty.

**When** the page finishes loading
**Then** the email input, the Turnstile container, and the submit button are all visible
**and** no element overflows the viewport horizontally
**and** the submit button's tap target is at least 44 px tall

### TC-24: /sponsors/all — XSS payload in search query does not execute

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with body `[]`.

**When** the user types `<script>window.__xss=1</script>` into the filter-name input (`data-testid="sponzori-vsetci-filter-name"`)
**Then** `window.__xss` is `undefined` in the page context
**and** the empty-filter message "Nič nezodpovedá filtru." is displayed without injecting any markup

### TC-25: /sponsors — "← Späť na domov" back link navigates to /

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with body `[]`.

**When** the user clicks the link "← Späť na domov"
**Then** the browser navigates to `/`

### TC-26: /sponsors/all — "← Späť na najnovších sponzorov" back link navigates to /sponsors

**Prerequisites**:
- Browser navigates to `http://localhost:8080/sponsors/all` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/public_sponsors**` returns HTTP 200 with body `[]`.

**When** the user clicks the link "← Späť na najnovších sponzorov"
**Then** the browser navigates to `/sponsors`

### TC-27: Keyboard-only: /manage-support form is fully operable without a mouse

**AC reference:** AC-5 (E11.4)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/manage-support` with a clean session, viewport 1280×800.
- `VITE_TURNSTILE_SITE_KEY` is empty (Turnstile widget not rendered; token auto-set to `"disabled"`).
- Consent banner dismissed via cookie pre-set.

**When** the user presses Tab until focus reaches the email input `<input id="email">`
**and** types `keyboard@example.com`
**and** presses Tab once more to advance focus past the Turnstile container
**and** presses Enter (or Space) when focus is on the submit button
**Then** a `page.route` intercept confirms the POST to `/api/portal-magic-link` was made
**and** the submitted state heading "Skontroluj e-mail" becomes visible

---

## Open questions

- The sponsor accordion and list heading elements (`<h1>`, `<h2>`, section labels) have **no `data-testid` attributes** in the current source (`sponsors.index.tsx`, `sponsors.all.tsx`). The generator will need to either add them (`sponzori-index-heading`, `sponzori-index-latest-section`, `sponzori-vsetci-heading`, `sponzori-vsetci-count-status`) or fall back to `getByRole("heading", { name: … })` locators. Per project rules, `data-testid` is preferred — the generator should add them when implementing these TCs.
- Similarly `manage-support.tsx` has no `data-testid` on the `<h1>`, the email `<input>`, the submit `<button>`, the error `<div role="alert">`, or the `<section role="status">`. Suggested IDs: `manage-support-heading`, `manage-support-email-input`, `manage-support-submit-button`, `manage-support-error-alert`, `manage-support-submitted-section`.
- TC-20 (Turnstile pending guard) verifies the `TURNSTILE_SITE_KEY && !turnstileToken` branch. If the dev environment always resolves Turnstile without a real key, the guard cannot be tested without temporarily setting a non-empty but invalid key. Confirm the test-environment approach with the team before the generator implements this TC.
- The `FETCH_LIMIT` constant in `sponsors.all.tsx` is 500. If the production database exceeds 500 opt-in sponsors, the `/sponsors/all` grid will silently truncate. No TC covers this today; add a TC when the limit is raised or pagination is implemented.
- `/manage-support` is currently listed as `robots: index, follow` in the source. Confirm this is intentional — the page does not contain sensitive data, but it is a functional form rather than informational content. If `noindex` is desired, the source and TC-12/TC-13 equivalent for this route should be updated accordingly.
