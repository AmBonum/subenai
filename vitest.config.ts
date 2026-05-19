import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest runs in a separate config from `vite.config.ts` so it does not pull
// in the TanStack Start / Cloudflare server plugins, which break `jsdom`.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: false,
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
      thresholds: { lines: 58, functions: 49 },
    },
  },
});
