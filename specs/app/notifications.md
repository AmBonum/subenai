# /app/notifications — test plan

**Component(s) under test:** `src/routes/app.notifications.tsx`
**POM:** `e2e/poms/app/AppNotificationsPage.ts`
**Spec:** `e2e/specs/app/notifications.spec.ts`
**Project:** `e2e-chromium`

---

## Context

The notifications page lists all notifications for the authenticated educator. Notifications have
an `event_type` (new_respondent | milestone | anomaly | expiry | daily_summary | system), a title,
an optional body, and a nullable `read_at` timestamp. Unread rows (`read_at IS NULL`) render with a
blue dot indicator and a per-row mark-read button. A bulk "Označiť všetky ako prečítané" button
appears in the page header only when at least one unread notification exists. A client-side
filter toggle ("Iba neprečítané") hides already-read rows without a server round-trip.

---

## Happy paths

### TC-01: Empty state when no notifications are seeded

**Prerequisites:** Educator session active; no rows in the `notifications` table.

**When** the user navigates to `/app/notifications`

**Then** the page root and header are visible

**and** the empty-state element contains the text "Žiadne notifikácie"

**and** the "Označiť všetky ako prečítané" button is NOT rendered (because unread count is 0)

---

### TC-02: Unread notification renders title, event-type badge, and unread dot

**Prerequisites:** Educator session active; one unread notification seeded with
`event_type: "new_respondent"`, `title: "Nový respondent"`, `read_at: null`.

**When** the user navigates to `/app/notifications`

**Then** the notification row is visible

**and** the event-type badge displays "new_respondent"

**and** the title element displays "Nový respondent"

**and** the unread dot indicator is visible

**and** the "Prečítané" mark-read button is visible

---

### TC-03: Filter-unread toggle shows only unread rows

**Prerequisites:** Educator session active; two notifications seeded — one unread
(`read_at: null`) and one already read (`read_at` set to a past ISO timestamp).

**When** the user navigates to `/app/notifications`

**Then** both rows are visible

**When** the user clicks the "Iba neprečítané" filter button

**Then** only the unread row remains in the list

**and** the read row is NOT present in the DOM

**When** the user clicks the "Iba neprečítané" filter button again

**Then** both rows are visible again

---

### TC-04: Mark-one-as-read removes the unread indicator for that row

**Prerequisites:** Educator session active; one unread notification seeded.

**When** the user navigates to `/app/notifications`

**Then** the unread dot and "Prečítané" button are visible

**When** the user clicks "Prečítané" for the notification

**Then** the unread dot is gone from the DOM

**and** the "Prečítané" button is gone from the DOM

**and** the notification row itself is still visible (the row is not deleted)

---

### TC-05: Mark-all-as-read bulk action clears all unread indicators

**Prerequisites:** Educator session active; two unread notifications seeded.

**When** the user navigates to `/app/notifications`

**Then** both unread dots are visible

**and** the "Označiť všetky ako prečítané" button is visible

**When** the user clicks "Označiť všetky ako prečítané"

**Then** both unread dots are gone from the DOM

**and** the "Označiť všetky ako prečítané" button disappears (unread count drops to 0)

---

## Edge cases

None identified beyond the cases above. The filter toggle is client-side state (no edge cases
from network failure). Mark-all uses `user_id` from `useCurrentProfile` — if the profile query
were to fail the button would fire `toast.error(t("mark_all"))` instead, but that path is
already guarded by the existing mock setup.
