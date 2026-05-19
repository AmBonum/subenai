/**
 * Module-level holder for the "currently active" Supabase auth session
 * used by Vitest specs that mock `@/integrations/supabase/client`.
 *
 * The default supabase-client mock in `tests/setup.ts` is a minimal stub
 * that doesn't pretend to have an auth state. Specs that need to assert
 * on signed-in vs signed-out behavior wire their own
 * `vi.mock("@/integrations/supabase/client", ...)` block. To keep that
 * boilerplate tiny they can call into this module:
 *
 *   vi.mock("@/integrations/supabase/client", async () => {
 *     const { getActiveSession } = await import("@/../tests/utils/auth-session-mock");
 *     return {
 *       supabase: {
 *         auth: {
 *           getSession: async () => ({ data: { session: getActiveSession() }, error: null }),
 *           getUser: async () => ({
 *             data: { user: getActiveSession()?.user ?? null },
 *             error: null,
 *           }),
 *           onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
 *         },
 *       },
 *     };
 *   });
 *
 * Then each test calls `setActiveSession(EDUCATOR_SESSION)` (or
 * `clearActiveSession()` to simulate signed-out). The `afterEach` in
 * `tests/setup.ts` clears the slot so leaked state never crosses tests.
 *
 * Shape matches `AuthSession` from `e2e/fixtures/auth.ts` so tests can
 * share fixtures between Vitest + Playwright suites.
 */

import type { AuthSession } from "../../e2e/fixtures/auth";

let activeSession: AuthSession | null = null;

export function setActiveSession(session: AuthSession | null): void {
  activeSession = session;
}

export function clearActiveSession(): void {
  activeSession = null;
}

export function getActiveSession(): AuthSession | null {
  return activeSession;
}
