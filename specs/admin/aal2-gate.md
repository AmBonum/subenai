# /admin AAL2 gate — test plan

**Area:** admin
**Component(s) under test:** `src/routes/admin.tsx`, `src/integrations/supabase/role-middleware.ts`, `src/integrations/supabase/auth-middleware.ts`
**Playwright project:** `e2e-chromium`
**Spec file:** `e2e/specs/admin/aal2-gate.spec.ts`

## Context

`/admin/*` is gated by `requireRole("admin", location.pathname)` which chains three checks in order:

1. `requireSupabaseAuth` — session must exist; no session → `/login?redirect=<path>`
2. `has_role(user_id, "admin")` RPC — role must be true; false → `/app`
3. AAL check — `currentLevel` must equal `"aal2"`; if AAL1 and a verified TOTP factor exists → `/login/verify-2fa?redirect=<path>`; if no factor → `/login/enroll-2fa?redirect=<path>`

These three TCs cover the three distinct blocked escalation paths. Any regression that silently passes one of them would expose the admin interface to an unprivileged or under-authenticated session.

## Happy paths

_(none — this plan covers only blocked paths)_

## Negative scenarios

### TC-01: Unauthenticated visit to /admin redirects to /login

**Prerequisites:**
- No active Supabase session in the browser context (fresh context, no auth seed)

**When** the user navigates directly to `/admin`

**Then** the browser is redirected to `/login` (URL matches `/login`)

**and** the admin shell (`data-testid="admin-shell-root"`) is never rendered

---

### TC-02: AAL1 admin session (verified TOTP factor, AAL1) redirects to /login/verify-2fa

**Prerequisites:**
- The Supabase session is seeded with an admin-role user (`has_role: ["admin"]`) who has a verified TOTP factor, but the session AAL is `"aal1"` (step-up not yet performed)
- The `has_role` RPC returns `true` for this user and the "admin" role
- The `/auth/v1/aal` intercept reports `currentLevel: "aal1"`

**When** the user navigates directly to `/admin`

**Then** the browser is redirected to `/login/verify-2fa` (URL matches `/login\/verify-2fa`)

**and** the URL carries the `redirect` search param pointing to `/admin`

**and** the 2FA challenge card (`data-testid="verify-2fa-card"`) is visible on the page

**and** the admin shell (`data-testid="admin-shell-root"`) is never rendered

---

### TC-03: Non-admin authenticated user redirected to /app

**Prerequisites:**
- The Supabase session is seeded with an educator-role user (AAL1, `has_role: ["educator"]`)
- The `has_role` RPC returns `false` for this user and the "admin" role

**When** the user navigates directly to `/admin`

**Then** the browser is redirected to `/app` (URL matches `/app`)

**and** the admin shell (`data-testid="admin-shell-root"`) is never rendered

## Edge cases

_(covered by the three negative scenarios above — the three gates are mutually exclusive and exhaustive for the security contract)_
