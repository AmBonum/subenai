import type { BrowserContext, Page } from "@playwright/test";

/**
 * Pre-seed a Supabase auth session into the browser context so a test
 * can start "already signed in" without driving the real login UI.
 *
 * Mirrors the `primeConsent` pattern in `consent.ts`: opt-in per spec,
 * called explicitly inside `test.beforeEach`, NOT auto-wired into the
 * composed base fixture.
 *
 * Usage:
 *   import { test } from "@/e2e/fixtures/base";
 *   import { primeAuthSession, EDUCATOR_SESSION } from "@/e2e/fixtures/auth";
 *
 *   test.beforeEach(async ({ context, page }) => {
 *     await primeAuthSession(context, page, EDUCATOR_SESSION);
 *   });
 *
 * Two layers compose into a working signed-in environment:
 *   1. localStorage seed — Supabase JS reads `sb-<projectRef>-auth-token`
 *      on init; without it the client hits `/auth/v1/token?refresh_token`.
 *   2. `page.route` intercepts for `/auth/v1/**` endpoints — the client
 *      still calls `/user`, `/factors`, `/token`, etc. as it warms up,
 *      and we want deterministic responses, not real network hits.
 *
 * Per-test overrides: routes are registered on the Page (not the
 * Context), so an individual test can `page.route` over the top to
 * simulate session expiry, factor changes, etc.
 */

export const SUPABASE_AUTH_STORAGE_KEY_PREFIX = "sb-";

/**
 * String marker for the role the fixture represents. NOT the same as the
 * DB `app_role` enum — this is a test-side convenience that specs can
 * inspect to assert role-gated branches without depending on a Supabase
 * RPC round-trip.
 */
export type AuthRoleMarker = "admin" | "moderator" | "educator" | "user";

export interface AuthFactor {
  id: string;
  friendly_name?: string | null;
  factor_type: "totp";
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  aud: "authenticated";
  role: "authenticated";
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: {
    provider: "email";
    providers: string[];
  };
  user_metadata: {
    has_role?: AuthRoleMarker[];
    [key: string]: unknown;
  };
  identities: unknown[];
  factors?: AuthFactor[];
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: "bearer";
  user: AuthUser;
  /** AAL the user has currently reached. AAL2 indicates a verified TOTP step-up. */
  aal?: "aal1" | "aal2";
  /** Active factor id used to reach `aal`. */
  factor_id?: string | null;
}

const RESPONDENT_USER_ID = "00000000-0000-0000-0000-000000000001";
const EDUCATOR_USER_ID = "00000000-0000-0000-0000-000000000002";
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000003";
const ADMIN_FACTOR_ID = "00000000-0000-0000-0000-0000000000f0";

const NOW = "2026-05-19T00:00:00.000Z";
// `expires_at` is consumed by supabase-js to decide whether the access
// token is stale. The 2026-05-19T01:00 value drifts into the past once
// the test clock crosses 01:00 UTC, causing supabase-js to fire an
// endless `/auth/v1/token?grant_type=refresh_token` loop that steals
// the navigator.locks auth lock from in-flight `auth.getUser()` calls.
// Use a far-future epoch so the client never schedules a refresh
// during a test run.
const ONE_HOUR_FROM_NOW = Math.floor(Date.parse("2099-01-01T00:00:00.000Z") / 1000);

function makeUser(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: "",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: NOW,
    phone: "",
    confirmed_at: NOW,
    last_sign_in_at: NOW,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

/**
 * Encode `value` as base64url (no padding) — matches the format
 * `decodeJWT` in `@supabase/auth-js` expects for each of the three
 * dot-separated JWT segments.
 */
function base64Url(value: string): string {
  const b64 = Buffer.from(value, "utf8").toString("base64");
  return b64.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Build a structurally-valid (unsigned) JWT carrying the `aal` claim.
 * Supabase JS's `getAuthenticatorAssuranceLevel` reads `payload.aal`
 * from `decodeJWT(access_token)` — it never verifies the signature,
 * so an unsigned token with the right shape is enough for tests.
 */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  // base64url-encoded "signature" — content doesn't matter, only shape.
  const signature = base64Url("e2e-signature");
  return `${header}.${body}.${signature}`;
}

function makeSession(overrides: Partial<AuthSession> & { user: AuthUser }): AuthSession {
  const aal = overrides.aal ?? "aal1";
  return {
    access_token: fakeJwt({
      sub: overrides.user.id,
      email: overrides.user.email,
      aal,
      exp: ONE_HOUR_FROM_NOW,
      iat: Math.floor(Date.parse(NOW) / 1000),
      role: "authenticated",
    }),
    refresh_token: `e2e-refresh-token-${overrides.user.id}`,
    expires_at: ONE_HOUR_FROM_NOW,
    expires_in: 3600,
    token_type: "bearer",
    aal: "aal1",
    factor_id: null,
    ...overrides,
  };
}

export const RESPONDENT_SESSION: AuthSession = makeSession({
  user: makeUser({
    id: RESPONDENT_USER_ID,
    email: "respondent@e2e.test",
    user_metadata: { has_role: [] },
  }),
  aal: "aal1",
});

export const EDUCATOR_SESSION: AuthSession = makeSession({
  user: makeUser({
    id: EDUCATOR_USER_ID,
    email: "educator@e2e.test",
    user_metadata: { has_role: ["educator"] },
  }),
  aal: "aal1",
});

export const ADMIN_SESSION: AuthSession = makeSession({
  user: makeUser({
    id: ADMIN_USER_ID,
    email: "admin@e2e.test",
    user_metadata: { has_role: ["admin"] },
    factors: [
      {
        id: ADMIN_FACTOR_ID,
        friendly_name: "primary",
        factor_type: "totp",
        status: "verified",
        created_at: NOW,
        updated_at: NOW,
      },
    ],
  }),
  aal: "aal2",
  factor_id: ADMIN_FACTOR_ID,
});

/**
 * Admin-role user who has a verified TOTP factor but has NOT yet completed
 * the AAL2 step-up for this session. Used to assert that the /admin gate
 * redirects to /login/verify-2fa rather than granting access.
 */
export const ADMIN_AAL1_SESSION: AuthSession = makeSession({
  user: makeUser({
    id: ADMIN_USER_ID,
    email: "admin@e2e.test",
    user_metadata: { has_role: ["admin"] },
    factors: [
      {
        id: ADMIN_FACTOR_ID,
        friendly_name: "primary",
        factor_type: "totp",
        status: "verified",
        created_at: NOW,
        updated_at: NOW,
      },
    ],
  }),
  aal: "aal1",
  factor_id: null,
});

export interface PrimeAuthSessionOptions {
  /**
   * Supabase project ref used to compose the storage key. Defaults to
   * `process.env.VITE_SUPABASE_PROJECT_ID` so the same value the running
   * app reads at build time is used at test time.
   */
  projectRef?: string;
}

function resolveProjectRef(opts?: PrimeAuthSessionOptions): string {
  const ref = opts?.projectRef ?? process.env.VITE_SUPABASE_PROJECT_ID;
  if (!ref) {
    throw new Error(
      "primeAuthSession: VITE_SUPABASE_PROJECT_ID is not set and no `projectRef` was passed. " +
        "Set it in .env or pass it explicitly so the localStorage key matches the Supabase client.",
    );
  }
  return ref;
}

export function authStorageKey(projectRef: string): string {
  return `${SUPABASE_AUTH_STORAGE_KEY_PREFIX}${projectRef}-auth-token`;
}

/**
 * Inject `session` into the page so the Supabase JS client boots already
 * authenticated and register intercepts so warm-up requests resolve
 * locally.
 *
 * Storage shape: Supabase JS v2 stores the session as a JSON-stringified
 * object directly under the `sb-<ref>-auth-token` key. Older versions
 * wrapped it in `[expiresAt, session]`; the current GoTrueClient reads
 * the bare object form.
 */
export async function primeAuthSession(
  context: BrowserContext,
  page: Page,
  session: AuthSession,
  opts?: PrimeAuthSessionOptions,
): Promise<void> {
  const projectRef = resolveProjectRef(opts);
  const storageKey = authStorageKey(projectRef);

  await context.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    { key: storageKey, value: JSON.stringify(session) },
  );

  const userJson = JSON.stringify(session.user);
  const sessionJson = JSON.stringify(session);
  const factors = session.user.factors ?? [];
  const totpFactors = factors.filter((f) => f.factor_type === "totp");
  const aal = session.aal ?? "aal1";

  await page.route("**/auth/v1/user**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: userJson,
    });
  });

  await page.route("**/auth/v1/factors**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ all: factors, totp: totpFactors }),
    });
  });

  await page.route("**/auth/v1/aal**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        currentLevel: aal,
        nextLevel: aal,
        currentAuthenticationMethods: [{ method: "password", timestamp: ONE_HOUR_FROM_NOW }],
      }),
    });
  });

  await page.route("**/auth/v1/token**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: sessionJson,
    });
  });

  await page.route("**/auth/v1/logout**", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
}
