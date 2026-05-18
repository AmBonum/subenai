import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", ".wrangler", "admin-hub"] },
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
      "@typescript-eslint/no-unused-vars": "off",
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
    // stores. AH-11.6 will delete the mock-* modules entirely; until then
    // the only remaining carve-outs are AH-12 schema-gap exemptions in the
    // user-scope block below.
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
                "CMS admin is wired to Supabase via @/lib/admin/queries.ts (AH-11.5a). cms-mock-store is type-only until AH-11.6 deletes it.",
              allowTypeImports: true,
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
    // future PRs from regressing to the platform mock stores. The two
    // files exempted below still import `useQuestions` from
    // `@/lib/platform/mock-store` because the production `questions`
    // table is missing the `type` and `category` columns the wizard /
    // library UI rely on; AH-12 schema enrichment closes that gap and
    // both files swap to `useLibraryQuestions` at that point.
    files: [
      "src/routes/app*/**/*.{ts,tsx}",
      "src/routes/app.*.{ts,tsx}",
      "src/components/user/**/*.{ts,tsx}",
      "src/components/app/**/*.{ts,tsx}",
    ],
    ignores: [
      // AH-12 schema-gap — questions table lacks type/category.
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
                "User scope is wired to Supabase via @/lib/platform/queries.ts. mock-store imports are AH-12 (schema-gap) carve-outs only.",
            },
            {
              name: "@/lib/platform/mock-user-data",
              message:
                "User scope is wired to Supabase via @/lib/platform/queries.ts. mock-store imports are AH-12 (schema-gap) carve-outs only.",
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
  eslintPluginPrettier,
);
