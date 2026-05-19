# Admin Users — test plan

**Area:** admin  
**Route:** `/admin/users`  
**Component(s) under test:** `src/routes/admin/users.lazy.tsx`  
**Auth requirement:** ADMIN_SESSION (AAL2, `has_role` mock returns `true`)  
**Data sources:** `profiles` table + `user_roles` table (joined client-side by `useAdminUsers`)

---

## Context

The Users page lists all profiles with their assigned roles and statuses. Filtering is
entirely client-side (search input + role select). The "edit role" button currently fires a
`toast.info` notification — no dialog exists yet. Assign/revoke dialog flows are deferred
to a future epic; TCs covering the edit-role button verify the toast behaviour.

---

## Happy paths

### TC-01: Empty state renders when no users exist

**Prerequisites:** Admin is signed in; `profiles` table is empty; `user_roles` is empty.

**When** the admin navigates to `/admin/users`.

**Then** the page root (`admin-users-root`) is visible.  
**and** the empty-state card (`admin-users-empty-state`) is visible.  
**and** the table (`admin-users-table`) is not in the DOM.

---

### TC-02: Populated list — user rows render with display name, email, and role badge

**Prerequisites:** Admin is signed in; two profiles are seeded (`alice@e2e.test`, `bob@e2e.test`);
one `user_roles` row assigns `alice` the `admin` role; `bob` has no role entry (defaults to `user`).

**When** the admin navigates to `/admin/users`.

**Then** the users table is visible.  
**and** the row for Alice is visible and contains the text `alice@e2e.test`.  
**and** the role badge for Alice shows `Admin`.  
**and** the row for Bob is visible and contains the text `bob@e2e.test`.  
**and** the role badge for Bob shows `Používateľ`.

---

### TC-03: Search input filters rows by email

**Prerequisites:** Same two users as TC-02.

**When** the admin navigates to `/admin/users`.  
**and** types `alice` into the search input (`admin-users-search-input`).

**Then** the row for Alice is visible.  
**and** the row for Bob is not visible.  
**and** the empty-state card is not in the DOM (the match exists).

---

### TC-04: Role filter narrows list to matching role only

**Prerequisites:** Same two users as TC-02 (Alice = `admin`, Bob = `user`).

**When** the admin navigates to `/admin/users`.  
**and** selects `admin` from the role filter select (`admin-users-role-filter`).

**Then** only the row for Alice is visible.  
**and** the row for Bob is not visible.

---

## Edge cases

### TC-05: Edit-role button fires the "Upraviť rolu" toast

**Prerequisites:** One profile seeded; navigated to `/admin/users`.

**When** the admin clicks the edit-role button for the seeded user (`admin-users-edit-role-<id>`).

**Then** a toast notification containing `"Upraviť rolu"` is visible on the page.

---

### TC-06: Search with no match shows the empty-state card

**Prerequisites:** One profile seeded (`alice@e2e.test`); navigated to `/admin/users`.

**When** the admin types `zzznomatch` into the search input.

**Then** the empty-state card (`admin-users-empty-state`) is visible.  
**and** the table (`admin-users-table`) is not in the DOM.  
**and** the empty-state description contains the text `"Pre zadané filtre sme nenašli žiadny záznam."`.
