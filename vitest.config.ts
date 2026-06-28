import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest runs in a separate config from `vite.config.ts` so it does not pull
// in the TanStack Start / Cloudflare server plugins, which break `jsdom`.
export default defineConfig(({ mode }) => {
  // PR #183 added `envPrefix` to expose SUPABASE_* keys but that only
  // reaches `import.meta.env` (Vite client). Vitest test files run in
  // Node and read `process.env.SUPABASE_SERVICE_ROLE_KEY` directly, so
  // we have to load .env ourselves and inject via `test.env`.
  // Additionally, `loadEnv` does NOT strip surrounding quotes — if a
  // developer writes `KEY="value"` (IDE auto-format frequently adds
  // them), the literal quotes reach the test and Supabase rejects the
  // key as "Invalid API key". Strip a single pair of matching quotes.
  const rawEnv = loadEnv(mode, process.cwd(), ["VITE_", "SUPABASE_", "PROD_INVARIANT_CHECK_KEY"]);
  const env = Object.fromEntries(
    Object.entries(rawEnv).map(([k, v]) => [k, v.replace(/^"(.*)"$|^'(.*)'$/, "$1$2")]),
  );

  return {
    plugins: [tsconfigPaths()],
    test: {
      env,
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      // Integration tests live in `tests/integration/**` and run via a
      // separate config (`vitest.integration.config.ts`) that loads
      // `.env.test.local` + hits a live local Supabase. They MUST NOT
      // be picked up by the default `npm test` because they require an
      // out-of-process dependency that CI doesn't always have.
      exclude: ["tests/integration/**", "node_modules/**", "dist/**"],
      css: false,
      // Default 5000ms was tight under parallel load — once the suite
      // grew past ~180 files, userEvent + waitFor chains in heavy
      // jsdom files (test-zostav composer) started timing out purely
      // on scheduler contention, not real failures. 10s absorbs the
      // jitter without masking real regressions; an assertion-failure
      // still fires within milliseconds.
      testTimeout: 10_000,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/integrations/supabase/types.ts",
          "src/routes/**/__root.tsx",
          "src/routeTree.gen.ts",
        ],
        reporter: ["text", "lcov", "html"],
        // Phase 0 baseline (2026-05-19): lines 58.08%, functions 49.15%.
        // The 70% target lives in PLAN-2026-05-19-testing-coverage.md and
        // is the exit criterion for the epic; Phase 1+ writes the tests
        // that lift the floor. Thresholds are pinned slightly below the
        // current baseline so a regression fails CI but new code does not
        // have to clear the final bar on day one.
        //
        // 2026-05-19 second update: PR #27 squash-merged ~30 new
        // components (E16 Akadémia, E17 cross-links, E18 home conversion,
        // E19 schools rework). Many are transitively covered by route-
        // level tests but the granular per-file ratio dipped to ~57.7%.
        // Floor adjusted down to 57 to reflect new reality. The fix is
        // adding tests, not bypassing CI — see backlog entry in
        // PLAN-2026-05-19-testing-coverage.md for the lift-back plan.
        //
        // 2026-06-28 RATCHET: the suite has since grown to ~3,826 tests
        // and measured coverage rose to stmts 60.81 / branch 54.84 /
        // funcs 55.01 / lines 63.72. Lock that level in — thresholds are
        // pinned ~1.5–2 pts below the live numbers (headroom for v8's
        // run-to-run jitter) so any regression fails CI while honest new
        // code does not have to clear the final 70% bar immediately. We
        // also add branch + statement gates that were previously
        // unenforced. Next step toward the 70% exit criterion in
        // PLAN-2026-05-19-testing-coverage.md: ratchet again after the
        // next coverage-lift batch — never lower these without a written
        // reason here.
        thresholds: { statements: 59, branches: 53, functions: 53, lines: 62 },
      },
    },
  };
});
