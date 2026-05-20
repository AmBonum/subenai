import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// E35.2 — Integration vitest config.
//
// Separate from the unit `vitest.config.ts` because:
//   - integration tests hit a live local Supabase at 127.0.0.1:54321
//   - they need a longer testTimeout (DB + network latency)
//   - they read `.env.test.local` for service-role + project ref
//   - they MUST NOT run in the default `npm test` invocation, only
//     under explicit `npm run test:integration` (or the CI job that
//     boots `supabase start` first).
//
// To run locally:
//   1. supabase start
//   2. cp .env.test.local.example .env.test.local
//   3. fill in SUPABASE_SERVICE_ROLE_TEST_KEY from `supabase status`
//   4. npm run test:integration
//
// Tests skip themselves with a clear message if the env is incomplete.

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/integration/setup-integration.ts"],
    css: false,
    testTimeout: 30_000,
    // Run sequentially — RLS tests share a small fixture set and
    // parallel writes from multiple workers would corrupt assertions.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
