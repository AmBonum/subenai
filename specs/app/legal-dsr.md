# /app/legal/dsr — GDPR data subject request page — test plan

**Area:** app
**Route:** `/app/legal/dsr`
**Component(s) under test:** `src/routes/app.legal.dsr.tsx`, `src/components/user/DsrSubmitForm.tsx`
**Project:** `e2e-chromium`
**Spec file:** `e2e/specs/app/legal-dsr.spec.ts`

---

## Prerequisites (all TCs)

- Authenticated educator session (mocked via `setupEducator`).
- `dsr_requests` table seeded as empty array so the history card shows the empty-state copy.
- Consent banner primed; the banner must NOT appear during these tests.

---

## Happy paths

### TC-01: Page renders with title, subtitle, form card, submit button, and empty history

**When** the user navigates to `/app/legal/dsr`.

**Then** the page root is visible.

**and** the heading reads "GDPR žiadosť (DSR)".

**and** the subtitle reads "Prístup k údajom · Výmaz · Portabilita · Obmedzenie · Námietka · SLA 30 dní.".

**and** the submit form card is visible with a submit button labelled "Podať žiadosť".

**and** the history card is visible showing the empty-state message "Zatiaľ nie sú žiadne žiadosti.".

---

### TC-02: Submitting a valid access request shows the success banner

**When** the user navigates to `/app/legal/dsr`.

**and** the user fills the email field with "test@example.sk".

**and** the user leaves the request-type selector on its default ("Prístup k údajom (čl. 15)").

**and** the user clicks the "Podať žiadosť" button.

**Then** the Supabase `dsr_requests` insert is intercepted by the mock (POST to `/rest/v1/dsr_requests`).

**and** the success banner appears with text "Žiadosť bola podaná — odpovieme do 30 dní.".

**and** the email field is cleared back to empty.

---

## Negative scenarios

### TC-03: Submitting with an invalid email shows an inline validation error

**When** the user navigates to `/app/legal/dsr`.

**and** the user types "not-an-email" into the email field.

**and** the user clicks the "Podať žiadosť" button.

**Then** no API call is made (client-side guard).

**and** the error banner appears with text "Neplatný e-mail.".

**and** the success banner is absent.
