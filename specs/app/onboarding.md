# `/app/onboarding` — test plan

**Area:** `specs/app/`
**Component(s) under test:** `src/routes/app.onboarding.tsx`, `src/routes/app.onboarding.lazy.tsx`, `src/i18n/locales/sk/auth.json` (onboarding section)
**Routes:** `/app/onboarding`
**API endpoints:** `GET /rest/v1/profile_preferences?...onboarded_at` (beforeLoad gate), `POST /rest/v1/profile_preferences` with `Prefer: resolution=merge-duplicates` (upsert on submit/skip)
**Data dependencies:** `profile_preferences` (single row per `user_id`; the gate redirects to `/app` when `onboarded_at` is non-null)
**Source stories:** _Phase 3 of `/app + header redesign` (`tasks/PLAN-2026-05-19-app-redesign.md`)_
**Last updated:** 2026-05-19

---

## Context

`/app/onboarding` is a one-shot 3-question form shown to authenticated
educators the first time they enter `/app`. The route's `beforeLoad`
reads `profile_preferences.onboarded_at` for the current session; when
set, it `throw redirect({ to: "/app" })` and the page never renders.
When unset, the form collects:

1. **Q1 (radio, required-ish):** `audience_kind` — `class | colleagues | clients | other`
2. **Q2 (checkboxes, multi-select):** `scam_interests` — any subset of
   `phishing | voice_clone | marketplace | investment | romance | tech_support | delivery | deepfake`
3. **Q3 (select, default `weekly`):** `digest_cadence` — `weekly | monthly | off`

Both the **Submit** and **Skip** buttons call the same `persist()`
helper — Skip submits an empty payload with `cadence: "weekly"`. Both
upsert `profile_preferences` (with `onboarded_at = now()`) and navigate
to `/app` on success. On upsert failure the form stays mounted and
shows the i18n string `auth.onboarding.error_generic` in
`[data-testid="onboarding-error-message"]`.

The route opts out of the marketing shell via
`staticData: { hideSiteHeader: true, hideSiteFooter: true }`.

## Out of scope

- The visual layout of the form fields (Card / RadioGroup / Checkbox /
  Select primitives are covered by their own component tests).
- The exact i18n strings — assertions match the rendered Slovak verbatim
  for the headings + button labels; per-option labels are checked by
  presence, not by string equality (lower brittleness).
- Server-side RLS on `profile_preferences` — covered separately in
  Phase 9 RLS pgTAP suite.
- The `/app` post-onboarding dashboard — covered by `app/dashboard.spec.ts`.
- The auth `beforeLoad` redirect to `/login` when no session — covered
  by `app/shell.spec.ts` (TC "unauthenticated visit to /app redirects").

---

## Happy paths

### TC-01: Onboarding page renders without site header/footer

**Prerequisites**:
- Educator session primed (`setupAppShell(..., { onboarded: false })`).
- Viewport 1280×800.

**When** the user navigates to `/app/onboarding`
**Then** the onboarding root (`data-testid="onboarding-root"`) is visible
**and** the onboarding card heading reads "Vitaj. Ako môžeme zladiť subenai pre teba?"
**and** the form, Q1/Q2/Q3 fieldsets, Submit button, and Skip button are all visible
**and** the site marketing header (`header[role='banner']`) is NOT rendered (staticData.hideSiteHeader)

### TC-02: Audience radio toggles selected state

**Prerequisites**:
- Educator session primed, onboarded=false. On `/app/onboarding`.

**When** the user clicks the `class` audience radio
**Then** the `class` radio is checked (`aria-checked="true"`)
**and** clicking `colleagues` afterwards leaves only `colleagues` checked

### TC-03: Submit with all 3 answers upserts and redirects to /app

**Prerequisites**:
- Educator session primed, onboarded=false. On `/app/onboarding`.
- `profile_preferences` upsert mocked to succeed.

**When** the user selects audience `class`, checks `phishing` + `deepfake` interests, and clicks Submit
**Then** the browser navigates to `/app`
**and** no error message is shown

### TC-04: Skip button upserts defaults and redirects to /app

**Prerequisites**:
- Educator session primed, onboarded=false. On `/app/onboarding`.
- `profile_preferences` upsert mocked to succeed.

**When** the user clicks Skip
**Then** the browser navigates to `/app`
**and** no error message is shown

### TC-05: Already-onboarded user is redirected away from /app/onboarding

**Prerequisites**:
- Educator session primed with `onboarded: true` (default for `setupEducator`).

**When** the user navigates to `/app/onboarding`
**Then** the browser ends on `/app` (or `/app/`) via the beforeLoad redirect
**and** the onboarding form is NOT rendered

---

## Negative paths

### TC-06: Upsert failure shows i18n error message inline

**Prerequisites**:
- Educator session primed, onboarded=false. On `/app/onboarding`.
- `profile_preferences` table mocked to return a `500` error.

**When** the user clicks Submit
**Then** the error region (`data-testid="onboarding-error-message"`) is visible
**and** it contains the Slovak text "Ukladanie zlyhalo. Skús to znovu."
**and** the browser remains on `/app/onboarding`
