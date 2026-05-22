/**
 * E49 Phase 1c-2 — setup project for `e2e-live-supabase`.
 *
 * Playwright runs this BEFORE the `e2e-live-supabase` test project
 * thanks to `dependencies: ["e2e-live-supabase-setup"]`. We delegate
 * the actual work to `e2e/global-setup.live-supabase.ts` so the bulk
 * of the lifecycle remains importable / testable independently.
 *
 * The setup function is idempotent: re-running it after a successful
 * previous run is a fast no-op (supabase already up, bundle already
 * baked, seeds already converged).
 */

import { test as setup } from "@playwright/test";

import globalSetup from "../../global-setup.live-supabase";

setup("boot supabase + seed + preview + wrangler", async () => {
  setup.setTimeout(300_000);
  await globalSetup({} as never);
});
