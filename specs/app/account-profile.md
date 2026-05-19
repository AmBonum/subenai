# /app/account/profile — test plan

**Component(s) under test:** `src/routes/app.account.profile.tsx`
**POM:** `e2e/poms/app/AppAccountProfilePage.ts`
**Project:** `e2e-chromium`
**Auth fixture:** educator session via `setupEducator`

---

## Happy paths

### TC-01: Profile form renders with name, email, and Save button

**Prerequisites:** Educator session mocked; user navigates to `/app/account/profile`.

**When** the page loads.

**Then** the profile form is visible.

**and** the display-name input is visible.

**and** the email input is visible.

**and** the Save button is visible.

---

### TC-02: Editing display_name and clicking Save shows success state

**Prerequisites:** Educator session mocked; user is on `/app/account/profile`.

**When** the user clears the display-name input and types a new name.

**and** the user clicks the Save button.

**Then** the "dirty" badge reads "Neuložené zmeny" while the form is unsaved.

**and** after saving, the success `sr-only` status element is visible.

---

### TC-03: "Prejsť na Bezpečnosť účtu" button links to /app/account/security

**Prerequisites:** Educator session mocked; user is on `/app/account/profile`.

**When** the page loads.

**Then** the security link button is visible.

**and** its `href` attribute points to `/app/account/security`.
