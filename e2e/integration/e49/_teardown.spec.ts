/**
 * E49 Phase 1c-2 — teardown project for `e2e-live-supabase`.
 *
 * Wired via the `teardown` property on the setup project — Playwright
 * runs this AFTER every test in the dependent project finishes (pass
 * or fail).
 */

import { test as teardown } from "@playwright/test";

import globalTeardown from "../../global-teardown.live-supabase";

teardown("stop preview + wrangler + cleanup seed", async () => {
  teardown.setTimeout(120_000);
  await globalTeardown();
});
