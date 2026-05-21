import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppPageExplainerPom } from "../../poms/user/AppPageExplainerPom";

// E48 — every /app/* menu route renders <AppPageExplainer> directly
// under its <PageHeader>. The component is identical across pages
// (only the pageKey changes), so a single POM + parametrised spec
// covers the entire surface.

/**
 * Empty-row superset of every table any /app page queries. Built from
 * a `grep .from("…")` sweep of src/routes/app.*.tsx, src/components/user,
 * src/components/app, src/lib, src/hooks, src/integrations. The
 * explainer itself does not query Supabase — this exists only so the
 * surrounding page renders without 500-ing on an unmocked table.
 */
const ALL_APP_TABLES_EMPTY = {
  answer_sets: [],
  answers: [],
  audit_log: [],
  blog_authors: [],
  blog_categories: [],
  blog_posts: [],
  categories: [],
  cms_footer: [],
  cms_header: [],
  cms_navigation: [],
  cms_pages: [],
  course_recommendations: [],
  dpa_requests: [],
  dsr_requests: [],
  mfa_backup_codes: [],
  notifications: [],
  profile_preferences: [],
  profiles: [],
  questions: [],
  quick_test_config: [],
  reports: [],
  respondent_groups: [],
  respondents: [],
  retest_reminders: [],
  sessions: [],
  share_card_config: [],
  team_members: [],
  teams: [],
  templates: [],
  test_questions: [],
  test_versions: [],
  tests: [],
  topics: [],
  trainings: [],
  user_digests: [],
  user_roles: [],
};

interface AppPageRow {
  key: string;
  url: string;
  exact?: boolean;
}

// Source of truth: src/components/user/AppShell.tsx (TVORBA + VYSLEDKY +
// FOOTER arrays). Keep ordering identical to the sidebar so a drift in
// one is obvious in the other.
const PAGES: ReadonlyArray<AppPageRow> = [
  { key: "dashboard", url: "/app", exact: true },
  { key: "tests", url: "/app/tests" },
  { key: "edu_tests", url: "/app/edu-tests" },
  { key: "templates", url: "/app/templates" },
  { key: "library", url: "/app/library" },
  { key: "audiences", url: "/app/audiences" },
  { key: "history", url: "/app/history" },
  { key: "notifications", url: "/app/notifications" },
  { key: "teams", url: "/app/teams" },
  { key: "profile", url: "/app/account/profile" },
  { key: "help", url: "/app/help" },
];

test.describe("AppPageExplainer — every /app/* menu route", () => {
  for (const row of PAGES) {
    test.describe(`${row.key} (${row.url})`, () => {
      // TC-01: root is visible after page load
      test("TC-01: explainer root renders after page load", async ({ context, page }) => {
        await setupEducator(context, page, { tables: ALL_APP_TABLES_EMPTY });
        const explainer = new AppPageExplainerPom(page);

        await test.step("Clear localStorage so prior persisted state cannot bleed in", async () => {
          await page.evaluate(() => localStorage.clear());
        });

        await test.step(`Navigate to ${row.url}`, async () => {
          await page.goto(row.url);
        });

        await test.step("Verify explainer root is visible", async () => {
          await expect(explainer.root).toBeVisible();
        });

        await test.step("Verify trigger button is visible", async () => {
          await expect(explainer.toggle).toBeVisible();
        });
      });

      // TC-02: collapsed by default
      test("TC-02: panel is collapsed by default (aria-expanded === false)", async ({
        context,
        page,
      }) => {
        await setupEducator(context, page, { tables: ALL_APP_TABLES_EMPTY });
        const explainer = new AppPageExplainerPom(page);

        await test.step("Clear localStorage to start from a clean default", async () => {
          await page.evaluate(() => localStorage.clear());
        });

        await test.step(`Navigate to ${row.url}`, async () => {
          await page.goto(row.url);
        });

        await test.step("Verify trigger reports aria-expanded='false'", async () => {
          await expect(explainer.toggle).toHaveAttribute("aria-expanded", "false");
          expect(await explainer.isExpanded()).toBe(false);
        });
      });

      // TC-03: expand → body visible, lead has non-empty text
      test("TC-03: expanding the panel reveals body and non-empty lead", async ({
        context,
        page,
      }) => {
        await setupEducator(context, page, { tables: ALL_APP_TABLES_EMPTY });
        const explainer = new AppPageExplainerPom(page);

        await test.step("Clear localStorage", async () => {
          await page.evaluate(() => localStorage.clear());
        });

        await test.step(`Navigate to ${row.url}`, async () => {
          await page.goto(row.url);
        });

        await test.step("Expand the panel via the toggle", async () => {
          await explainer.expand();
        });

        await test.step("Verify aria-expanded flipped to 'true'", async () => {
          await expect(explainer.toggle).toHaveAttribute("aria-expanded", "true");
        });

        await test.step("Verify body is visible", async () => {
          await expect(explainer.body).toBeVisible();
        });

        await test.step("Verify lead paragraph is visible and has non-empty text", async () => {
          await expect(explainer.lead).toBeVisible();
          const leadText = (await explainer.lead.textContent())?.trim() ?? "";
          expect(leadText.length).toBeGreaterThan(0);
        });
      });

      // TC-04: reload → panel remains expanded (localStorage persisted)
      test("TC-04: expanded state persists across reload via localStorage", async ({
        context,
        page,
      }) => {
        await setupEducator(context, page, { tables: ALL_APP_TABLES_EMPTY });
        const explainer = new AppPageExplainerPom(page);

        await test.step("Clear localStorage so the default really is collapsed", async () => {
          await page.evaluate(() => localStorage.clear());
        });

        await test.step(`Navigate to ${row.url}`, async () => {
          await page.goto(row.url);
        });

        await test.step("Expand the panel", async () => {
          await explainer.expand();
          await expect(explainer.toggle).toHaveAttribute("aria-expanded", "true");
        });

        await test.step("Reload the page", async () => {
          await page.reload();
        });

        await test.step("Verify the panel is still expanded after reload", async () => {
          await expect(explainer.toggle).toHaveAttribute("aria-expanded", "true");
          await expect(explainer.body).toBeVisible();
        });
      });
    });
  }

  // TC-05: docs link href starts with /docs/app/ (representative: /app/tests)
  test("TC-05: tests page first doc link points at /docs/app/* URL scheme", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: ALL_APP_TABLES_EMPTY });
    const explainer = new AppPageExplainerPom(page);

    await test.step("Clear localStorage", async () => {
      await page.evaluate(() => localStorage.clear());
    });

    await test.step("Navigate to /app/tests", async () => {
      await page.goto("/app/tests");
    });

    await test.step("Expand the panel so the docs section is rendered", async () => {
      await explainer.expand();
      await expect(explainer.body).toBeVisible();
    });

    await test.step("Verify docs section heading is visible", async () => {
      await expect(explainer.docsHeading).toBeVisible();
    });

    await test.step("Verify first doc link href matches /docs/app/* scheme", async () => {
      await expect(explainer.docLink(0)).toBeVisible();
      const href = await explainer.docLink(0).getAttribute("href");
      expect(href).toMatch(/^\/docs\/app\//);
    });
  });
});
