# Admin Support — test plan

**Area:** admin  
**Route:** `/admin/support`  
**Component(s) under test:** `src/routes/admin/support.lazy.tsx`  
**Auth requirement:** ADMIN_SESSION (AAL2, `has_role` mock returns `true`)  
**Data sources:** in-memory `SupportChannelConfig` store (`src/lib/admin/support-config.ts`)

---

## Context

The Support page lets an admin configure the contact channels (email, phone, office
hours) that are displayed on public-facing pages. The form validates the email and phone
fields client-side; invalid input shows inline error messages. On success a Sonner toast
confirms the save. A read-only channel preview list below the form reflects the current
config immediately.

The backing store is in-memory (no DB round-trip) until AH-11 adds Supabase persistence.
All three TCs are fully testable against the mock store.

---

## Happy paths

### TC-01: Page renders root, form fields, and channel list

**Prerequisites:** Admin is signed in; navigated to `/admin/support`.

**When** the admin navigates to `/admin/support`.

**Then** the page root (`admin-support-root`) is visible.  
**and** the form (`admin-support-form`) is visible.  
**and** the email input (`admin-support-email-input`) is visible.  
**and** the phone input (`admin-support-phone-input`) is visible.  
**and** the hours input (`admin-support-hours-input`) is visible.  
**and** the submit button (`admin-support-submit`) is visible and enabled.  
**and** the channel list (`admin-support-channel-list`) is visible and contains the default email `"subenai.podpora@gmail.com"`.

---

### TC-02: Submitting valid data updates the channel list and shows the success toast

**Prerequisites:** Admin is signed in; navigated to `/admin/support`; form is visible.

**When** the admin clears the email input and types `"nova@firma.sk"`.  
**and** clears the phone input and types `"+421 910 000 111"`.  
**and** clicks the submit button (`admin-support-submit`).

**Then** a Sonner toast appears containing the text `"Kontaktné údaje boli aktualizované."`.  
**and** the channel list (`admin-support-channel-list`) contains the updated email `"nova@firma.sk"`.  
**and** the channel list contains the updated phone `"+421 910 000 111"`.

---

## Negative scenarios

### TC-03: Submitting an invalid email and phone shows inline validation errors

**Prerequisites:** Admin is signed in; navigated to `/admin/support`; form is visible.

**When** the admin clears the email input and types `"not-an-email"`.  
**and** clears the phone input and types `"abc"`.  
**and** clicks the submit button (`admin-support-submit`).

**Then** the email error element (`admin-support-email-error`) is visible and contains the text `"Neplatný formát e-mailu."`.  
**and** the phone error element (`admin-support-phone-error`) is visible and contains the text `"Neplatný formát telefónneho čísla."`.  
**and** no success toast appears (the form submission was blocked by validation).

> **Note:** The channel list preview is a live reflection of the controlled form inputs,
> not a persisted snapshot. The observable contract for a blocked save is the absence of
> the success toast, not the channel list value.
