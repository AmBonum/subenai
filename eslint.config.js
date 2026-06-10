import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `.claude/worktrees/**` are sibling agent worktrees — each is its own
  // clone of the repo. Linting them produces 1300+ duplicate errors that
  // mask real issues in the main tree. The main lint excludes them entirely;
  // each worktree's own lint config still applies inside it.
  { ignores: ["dist", ".output", ".vinxi", ".wrangler", "admin-hub", ".claude/worktrees/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Senior UX rule — no default browser modals in app code. Every
    // confirmation/dialog goes through shadcn ConfirmDialog / Dialog.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "confirm",
          message:
            "Use ConfirmDialog (src/components/admin/ConfirmDialog.tsx) — window.confirm is forbidden in src/**.",
        },
        {
          object: "window",
          property: "alert",
          message: "Use a shadcn Dialog / toast — window.alert is forbidden in src/**.",
        },
        {
          object: "window",
          property: "prompt",
          message:
            "Use a shadcn Dialog with an input field — window.prompt is forbidden in src/**.",
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "confirm",
          message:
            "Use ConfirmDialog (src/components/admin/ConfirmDialog.tsx) — confirm() is forbidden in src/**.",
        },
        {
          name: "alert",
          message: "Use a shadcn Dialog / toast — alert() is forbidden in src/**.",
        },
        {
          name: "prompt",
          message: "Use a shadcn Dialog with an input field — prompt() is forbidden in src/**.",
        },
      ],
    },
  },
  {
    // AH-1.7 — supabaseAdmin / service-role import lockdown.
    // The admin Supabase client (added in AH-11) MUST only be imported
    // from server-only modules (*.server.ts, CF Pages Functions, or
    // server routes). Importing it from a client component leaks the
    // service-role key into the browser bundle. This rule is the
    // lint-time guard against that mistake.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/**/*.server.ts",
      "src/**/*.functions.ts",
      "src/integrations/supabase/admin.ts",
      "src/integrations/supabase/client.server.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/integrations/supabase/admin",
              message:
                "supabaseAdmin must only be imported from *.server.ts, *.functions.ts, or functions/** — never from client code (AH-1.7).",
            },
            {
              name: "@/integrations/supabase/client.server",
              message:
                "client.server must only be imported from *.server.ts, *.functions.ts, or functions/** — never from client code (AH-1.7).",
            },
          ],
          patterns: [
            {
              group: ["**/integrations/supabase/admin", "**/integrations/supabase/client.server"],
              message:
                "Service-role Supabase client is server-only. See AH-1.7 in /tasks/PLAN-2026-05-17-admin-hub-integration.md.",
            },
          ],
        },
      ],
    },
  },
  {
    // AH-11.1d — admin Supabase cutover guard.
    // Admin scope (`src/routes/admin/**`, `src/components/admin/**`) is wired
    // to real Supabase via `@/lib/admin/queries.ts` (AH-11.1a/b/c, AH-11.5a
    // for CMS). This rule prevents future PRs from regressing to the mock
    // stores. AH-11.6 relocated CMS types to `@/lib/admin/cms-types` and
    // deleted `@/lib/platform/mock-user-data`. The remaining mock modules
    // (`mock-store`, `mock-data`, `answer-sets-mock-store`,
    // `cms-mock-store`, platform `mock-store`) are AH-14 carve-outs: the
    // answer-sets viewer, respondent reads, and /app/{tests/new,library}
    // questions still need Supabase wiring before they can be removed.
    files: ["src/routes/admin/**/*.{ts,tsx}", "src/components/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/integrations/supabase/admin",
              message:
                "supabaseAdmin must only be imported from *.server.ts, *.functions.ts, or functions/** — never from client code (AH-1.7).",
            },
            {
              name: "@/integrations/supabase/client.server",
              message:
                "client.server must only be imported from *.server.ts, *.functions.ts, or functions/** — never from client code (AH-1.7).",
            },
            {
              name: "@/lib/admin/mock-store",
              message:
                "Admin scope is wired to Supabase via @/lib/admin/queries.ts. mock-store imports are AH-11.5 (CMS) scope only.",
            },
            {
              name: "@/lib/admin/mock-data",
              message:
                "Admin scope is wired to Supabase via @/lib/admin/queries.ts. mock-store imports are AH-11.5 (CMS) scope only.",
            },
            {
              name: "@/lib/admin/answer-sets-mock-store",
              message:
                "Admin scope is wired to Supabase via @/lib/admin/queries.ts. mock-store imports are AH-11.5 (CMS) scope only.",
            },
            {
              name: "@/lib/admin/cms-mock-store",
              message:
                "CMS admin is wired to Supabase via @/lib/admin/queries.ts (AH-11.5a). Import CMS types from @/lib/admin/cms-types — the mock module exists only as a Vitest seed source.",
            },
            {
              name: "@/lib/platform/mock-store",
              message:
                "Admin scope is wired to Supabase via @/lib/admin/queries.ts. mock-store imports are AH-11.5 (CMS) scope only.",
            },
          ],
          patterns: [
            {
              group: ["**/integrations/supabase/admin", "**/integrations/supabase/client.server"],
              message:
                "Service-role Supabase client is server-only. See AH-1.7 in /tasks/PLAN-2026-05-17-admin-hub-integration.md.",
            },
          ],
        },
      ],
    },
  },
  {
    // AH-11.2d — user-scope Supabase cutover guard.
    // User scope (`src/routes/app*/**`, `src/components/user/**`,
    // `src/components/app/**`) is wired to real Supabase via
    // `@/lib/platform/queries.ts` (AH-11.2a/b/c). This rule prevents
    // future PRs from regressing to the platform mock store. The two
    // files exempted below still import `useQuestions` from
    // `@/lib/platform/mock-store` because the production `questions`
    // table is missing the `type` and `category` columns the wizard /
    // library UI rely on; AH-14 schema enrichment closes that gap and
    // both files swap to `useLibraryQuestions` at that point. The
    // `mock-user-data` rule is retained as a tripwire even though
    // AH-11.6 deleted the file — re-introducing it should fail lint.
    files: [
      "src/routes/app*/**/*.{ts,tsx}",
      "src/routes/app.*.{ts,tsx}",
      "src/components/user/**/*.{ts,tsx}",
      "src/components/app/**/*.{ts,tsx}",
    ],
    ignores: [
      // AH-14 schema-gap — questions table lacks type/category.
      "src/routes/app.tests.new.tsx",
      "src/routes/app.library.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/platform/mock-store",
              message:
                "User scope is wired to Supabase via @/lib/platform/queries.ts. mock-store imports are AH-14 (schema-gap) carve-outs only.",
            },
            {
              name: "@/lib/platform/mock-user-data",
              message:
                "@/lib/platform/mock-user-data was deleted in AH-11.6. Use @/lib/platform/seed + queries.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    // shadcn UI primitives, the consent provider/hook pair, and the router
    // entry point intentionally co-locate non-component exports (variants,
    // hooks, factories) with components. Fast-refresh granularity is not a
    // concern there — disable the rule rather than splitting boilerplate.
    files: ["src/components/ui/**/*.{ts,tsx}", "src/hooks/useConsent.tsx", "src/router.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Playwright fixtures use a destructured `use` callback that the
    // react-hooks plugin mistakes for a React hook. e2e/ has no React
    // — disable both react-* rule sets for the entire Playwright tree.
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // POM-only locators in Playwright specs (CLAUDE.md canonical rule).
    // Element locators live in e2e/poms/** getters; specs consume them.
    files: ["e2e/specs/**/*.{ts,tsx}", "e2e/integration/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='page'][callee.property.name=/^(locator|getByTestId|getByRole|getByText|getByLabel|getByPlaceholder|getByTitle|getByAltText)$/]",
          message:
            "Specs must not locate elements directly on `page`. Add a getter to the relevant POM in e2e/poms/ and use it from the spec.",
        },
      ],
    },
  },
  eslintPluginPrettier,
);
