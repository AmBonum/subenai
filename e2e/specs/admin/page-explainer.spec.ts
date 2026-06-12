import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminPageExplainerPom } from "../../poms/admin/AdminPageExplainerPom";

// E47 — every /admin/* route renders <AdminPageExplainer> directly
// under its <PageHeader>. The component is identical across pages
// (only the pageKey changes), so a single POM + parametrised spec
// covers the entire surface.

/**
 * Empty-row superset of every table any admin page queries. Built from
 * a `grep .from("…")` sweep of src/routes/admin, src/components/admin,
 * src/lib, src/hooks. The explainer itself does not query Supabase —
 * this exists only so the surrounding page renders without 500-ing on
 * an unmocked table.
 */
const ALL_ADMIN_TABLES_EMPTY = {
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
  questions: [],
  quick_test_config: [],
  reports: [],
  respondent_groups: [],
  respondents: [],
  retest_reminders: [],
  sessions: [],
  share_card_config: [],
  support_ticket_attachments: [],
  support_ticket_messages: [],
  support_tickets: [],
  support_tickets_with_assignees: [],
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

interface AdminPageRow {
  key: string;
  url: string;
  exact?: boolean;
}

// Source of truth: src/components/admin/AdminSidebar.tsx (mainItems +
// cmsItems + systemItems). Keep ordering identical to the sidebar so a
// drift in one is obvious in the other.
const PAGES: ReadonlyArray<AdminPageRow> = [
  { key: "dashboard", url: "/admin", exact: true },
  { key: "tests", url: "/admin/tests" },
  { key: "quick_test", url: "/admin/quick-test" },
  { key: "share_card", url: "/admin/share-card" },
  { key: "questions", url: "/admin/questions" },
  { key: "answer_sets", url: "/admin/answer-sets" },
  { key: "trainings", url: "/admin/trainings" },
  { key: "users", url: "/admin/users" },
  { key: "categories", url: "/admin/categories" },
  { key: "reports", url: "/admin/reports" },
  // E48.6 — the sidebar "support" item points at the tickets queue;
  // /admin/support is only a back-compat redirect to /admin/tickets.
  { key: "support", url: "/admin/tickets" },
  { key: "blog", url: "/admin/blog" },
  { key: "pages", url: "/admin/pages" },
  { key: "navigation", url: "/admin/navigation" },
  { key: "header", url: "/admin/header" },
  { key: "footer", url: "/admin/footer" },
  { key: "dsr", url: "/admin/dsr" },
  { key: "dpa_requests", url: "/admin/dpa-requests" },
  { key: "settings", url: "/admin/settings" },
  { key: "security", url: "/admin/security" },
];

test.describe("AdminPageExplainer — every /admin/* route", () => {
  for (const row of PAGES) {
    test.describe(`${row.key} (${row.url})`, () => {
      // TC-01: root is visible after page load
      test("TC-01: explainer root renders after page load", async ({ context, page }) => {
        await setupAdmin(context, page, { tables: ALL_ADMIN_TABLES_EMPTY });
        const explainer = new AdminPageExplainerPom(page);

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
        await setupAdmin(context, page, { tables: ALL_ADMIN_TABLES_EMPTY });
        const explainer = new AdminPageExplainerPom(page);

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
        await setupAdmin(context, page, { tables: ALL_ADMIN_TABLES_EMPTY });
        const explainer = new AdminPageExplainerPom(page);

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
        await setupAdmin(context, page, { tables: ALL_ADMIN_TABLES_EMPTY });
        const explainer = new AdminPageExplainerPom(page);

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

  // TC-05: docs link href starts with /docs/admin/ (representative: users page)
  test("TC-05: users page first doc link points at /docs/admin/* URL scheme", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: ALL_ADMIN_TABLES_EMPTY });
    const explainer = new AdminPageExplainerPom(page);

    await test.step("Navigate to /admin/users", async () => {
      await page.goto("/admin/users");
    });

    await test.step("Expand the panel so the docs section is rendered", async () => {
      await explainer.expand();
      await expect(explainer.body).toBeVisible();
    });

    await test.step("Verify docs section heading is visible", async () => {
      await expect(explainer.docsHeading).toBeVisible();
    });

    await test.step("Verify first doc link href matches /docs/admin/* scheme", async () => {
      await expect(explainer.docLink(0)).toBeVisible();
      const href = await explainer.docLink(0).getAttribute("href");
      expect(href).toMatch(/^\/docs\/admin\//);
    });
  });
});
