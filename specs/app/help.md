# /app/help — test plan

**Route:** `/app/help`
**Component(s) under test:** `src/routes/app.help.tsx`
**Spec file:** `e2e/specs/app/help.spec.ts`
**POM:** `e2e/poms/app/AppHelpPage.ts`
**Prerequisites for all TCs:** authenticated educator session (via `setupEducator`).

---

## Happy paths

### TC-01: Page renders page header, search input, FAQ list and contact card

**Prerequisites:** Authenticated educator. Browser at default viewport.

**When** the user navigates to `/app/help`

**Then** the page header is visible and contains the title "Najčastejšie otázky"

**and** the search input (`app-help-search-input`) is visible

**and** the FAQ accordion list (`app-help-faq-list`) is visible and contains at least one item

**and** the contact card (`app-help-contact-card`) is visible with subtitle text containing "formulár podpory" and a contact CTA button (`app-help-contact-cta`)

> 2026-06-11: both contact CTAs (contact card + search empty state) are
> `<Link to="/app/help/contact">` — the former `mailto:support@subenai.sk`
> anchors are gone; TC-06 additionally verifies the click navigates to the
> in-app support form (`/app/help/contact`), labelled "Kontaktovať podporu".

---

### TC-02: Search filters FAQ items and clearing restores the full list

**Prerequisites:** Authenticated educator. `/app/help` is open.

**When** the user types "vytvorím nový test" into the search input

**Then** FAQ item 0 (question: "Ako vytvorím nový test?") remains visible

**and** FAQ item 1 (unrelated question) is no longer rendered

**When** the user clears the search input

**Then** the full FAQ list is restored and FAQ item 1 is visible again

---

### TC-03: FAQ accordion item expands and collapses on trigger click

**Prerequisites:** Authenticated educator. `/app/help` is open.

**When** the page loads

**Then** the content for FAQ item 0 (`app-help-faq-content-0`) is hidden

**When** the user clicks the trigger for FAQ item 0 (`app-help-faq-trigger-0`)

**Then** the content for FAQ item 0 is visible and contains "Klikni na 'Nový test'"

**When** the user clicks the trigger for FAQ item 0 again

**Then** the content for FAQ item 0 is hidden again

---

## Edge cases

None identified for this static informational route.

## Negative scenarios

None identified — the route has no form submission or destructive actions.
