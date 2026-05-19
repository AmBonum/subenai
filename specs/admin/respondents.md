# Admin respondents — test plan

**Route:** `/admin/respondents`
**Component(s) under test:** `src/routes/admin/respondents.lazy.tsx`, `src/components/admin/RespondentsList.tsx`, `src/components/admin/PageHeader.tsx`
**i18n namespace:** `respondents_list` (governance.json, sk locale)
**Project:** `e2e-chromium`
**Spec file:** `e2e/specs/admin/respondents.spec.ts`

---

## Prerequisites (all TCs)

- Admin session (AAL2) seeded via `setupAdmin`.
- `respondents`, `sessions`, `tests` tables mocked.
- `log_audit_event` RPC mocked (called on every mount and filter change by `useEffect` in `RespondentsList`).

---

## Happy paths

### TC-01: Empty state renders when respondents list is empty

**Prerequisites:** `respondents: []`, `sessions: []`, `tests: []`.

**When** the admin navigates to `/admin/respondents`.

**Then** the page root (`admin-respondents-root`) is visible.

**and** the page header title reads "Respondenti".

**and** the page header description reads "0 respondentov · prístup k PII sa loguje.".

**and** the empty-state card (`respondents-list-empty-state`) is visible with text "Žiadni respondenti.".

**and** the table (`respondents-list-table`) is not in the DOM.

---

### TC-02: Populated list shows respondent rows with name, email, and session count

**Prerequisites:** one respondent row seeded (`id: "resp_e2e_001"`, `display_name: "Jana Nováková"`, `email: "jana@e2e.test"`, `anonymized_at: null`), one session row linking that respondent to a test, `tests: []`.

**When** the admin navigates to `/admin/respondents`.

**Then** the respondents table (`respondents-list-table`) is visible.

**and** the respondent row (`respondents-list-row-resp_e2e_001`) is visible.

**and** the row contains the text "Jana Nováková".

**and** the row contains the email "jana@e2e.test".

**and** the view button (`respondents-list-row-view-button-resp_e2e_001`) is visible.

---

### TC-03: Clicking the view button fires the PII-access toast

**Prerequisites:** same as TC-02.

**When** the admin navigates to `/admin/respondents`.

**and** the admin clicks the view button for the seeded respondent.

**Then** a Sonner toast with the text "Prístup k PII zalogovaný." appears.
