import type { BrowserContext, Page } from "@playwright/test";

import { primeConsent } from "../fixtures/consent";
import { ADMIN_SESSION, EDUCATOR_SESSION, type AuthSession } from "../fixtures/auth";
import { mockSupabase, type MockSupabaseConfig } from "../mocks/supabase";
import { resetSeedCounters, seedProfile } from "../seed";

/**
 * Shared beforeEach setup for /app/* and /admin/* specs.
 *
 * Wires the three layers Phase 1 ships:
 *   1. cookie consent primed (so the banner never paints)
 *   2. Supabase auth session primed (so `/auth/v1/user` returns instantly)
 *   3. PostgREST route mocks (so every table read resolves locally)
 *
 * Per-spec specifics (extra seeded tables, RPC mocks) layer on top via
 * the `extras` argument — calling `mockSupabase` twice is fine, later
 * routes take precedence per Playwright's reverse-registration rule.
 */
export interface AppShellSetupOptions {
  session: AuthSession;
  extras?: MockSupabaseConfig;
  /** When true, `profile_preferences.onboarded_at` is set so /app passes the requireOnboarded gate. */
  onboarded?: boolean;
}

const ONBOARDED_AT_ISO = "2026-05-01T00:00:00.000Z";

function profilePreferences(userId: string, onboarded: boolean) {
  return {
    user_id: userId,
    audience_kind: null,
    scam_interests: [],
    digest_cadence: "weekly",
    digest_quiet_weeks: false,
    onboarded_at: onboarded ? ONBOARDED_AT_ISO : null,
    share_handle: null,
    created_at: ONBOARDED_AT_ISO,
    updated_at: ONBOARDED_AT_ISO,
  };
}

export async function setupAppShell(
  context: BrowserContext,
  page: Page,
  opts: AppShellSetupOptions,
): Promise<void> {
  const { session, extras, onboarded = true } = opts;
  resetSeedCounters();
  await primeConsent(context, "all");
  // Note: `mockSupabase({ auth: { session } })` already calls
  // `primeAuthSession`. Don't double-register or the two layers race on
  // the localStorage init script.

  const baseTables = {
    profiles: [
      seedProfile({
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.email.split("@")[0],
      }),
    ],
    profile_preferences: [profilePreferences(session.user.id, onboarded)],
    notifications: [],
    teams: [],
    team_members: [],
    tests: [],
    sessions: [],
    respondents: [],
  };

  // `useAuth()` calls `has_role(user_id, 'admin')` on every /app render
  // to decide whether to show the admin link. Default: derive from the
  // session's user_metadata.has_role marker so educator/admin sessions
  // get the right answer without each spec re-mocking the RPC.
  const isAdminFromMarker = (session.user.user_metadata?.has_role ?? []).includes("admin");
  const baseRpcs: Record<string, unknown> = {
    has_role: (body: unknown) => {
      const role = (body as { _role?: string } | null | undefined)?._role;
      if (role === "admin") return isAdminFromMarker;
      return true;
    },
  };

  const merged: MockSupabaseConfig = {
    auth: { session },
    tables: { ...baseTables, ...(extras?.tables ?? {}) },
    rpcs: { ...baseRpcs, ...(extras?.rpcs ?? {}) },
    errors: { ...(extras?.errors ?? {}) },
    generateIds: extras?.generateIds,
  };
  await mockSupabase(page, merged);
}

export async function setupEducator(
  context: BrowserContext,
  page: Page,
  extras?: MockSupabaseConfig,
): Promise<void> {
  return setupAppShell(context, page, { session: EDUCATOR_SESSION, extras });
}

/**
 * Admin setup. /admin/* additionally calls the `has_role` RPC and reads
 * AAL — the ADMIN_SESSION already declares aal2, and we always mock
 * `has_role: true` so the role gate passes.
 */
export async function setupAdmin(
  context: BrowserContext,
  page: Page,
  extras?: MockSupabaseConfig,
): Promise<void> {
  return setupAppShell(context, page, { session: ADMIN_SESSION, extras });
}
