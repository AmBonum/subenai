// Authed-surface negative paths — teams, templates, account export, onboarding
// Plan: specs/cross-cutting/app-admin-negative-paths.md

import { test, expect } from "../../fixtures/base";
import { setupEducator, setupAppShell } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedProfile, seedTeam } from "../../seed";
import { AppTeamsPage } from "../../poms/app/AppTeamsPage";
import { AppTemplatesPage } from "../../poms/app/AppTemplatesPage";
import { AppAccountProfilePage } from "../../poms/app/AppAccountProfilePage";
import { AppOnboardingPage } from "../../poms/app/AppOnboardingPage";

// ---------------------------------------------------------------------------
// Shared seed data
// ---------------------------------------------------------------------------

const TEAM = seedTeam({
  id: "team_neg_001",
  owner_id: EDUCATOR_SESSION.user.id,
  name: "Neg Squad",
});

const MEMBER_PROFILE = seedProfile({
  id: "prof_neg_member_001",
  email: "negmember@e2e.test",
  display_name: "Neg Member",
  avatar_initials: "NM",
});

const MEMBER_ROW = {
  id: "tm_neg_001",
  team_id: TEAM.id,
  user_id: MEMBER_PROFILE.id,
  role: "editor" as const,
  joined_at: "2026-05-19T00:00:00.000Z",
};

const NOW = "2026-06-01T10:00:00.000Z";

function publicTemplate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tpl_neg_001",
    title: "Onboarding kvíz",
    description: "Šablóna pre onboarding.",
    question_ids: ["q1", "q2"],
    gdpr_purpose: "internal_training",
    owner_id: null,
    visibility: "public",
    fork_of: null,
    status: "published",
    license: "cc-by-4.0",
    author_display_name: null,
    age_rating: "all",
    slug: "onboarding-kviz",
    published_at: NOW,
    updated_at: NOW,
    created_at: NOW,
    ...overrides,
  };
}

const TPL_PUBLIC = publicTemplate();

const TPL_MINE = publicTemplate({
  id: "tpl_neg_mine",
  title: "Moja kópia onboarding kvízu",
  description: "Kópia.",
  owner_id: EDUCATOR_SESSION.user.id,
  visibility: "private",
  fork_of: "tpl_neg_001",
  status: "draft",
  slug: null,
  published_at: null,
});

// ---------------------------------------------------------------------------
// A. Teams (/app/teams)
// ---------------------------------------------------------------------------

test.describe("A. Teams — member mutation failure paths", () => {
  // AA-02: member role update failure surfaces a toast, member list unchanged
  test("AA-02: member role update failure surfaces a toast; member list unchanged", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: {
        teams: [TEAM],
        team_members: [MEMBER_ROW],
        profiles: [
          seedProfile({
            id: EDUCATOR_SESSION.user.id,
            email: EDUCATOR_SESSION.user.email,
            display_name: "educator",
          }),
          MEMBER_PROFILE,
        ],
      },
    });

    const teams = new AppTeamsPage(page);

    await test.step("Open /app/teams and verify member row is visible", async () => {
      await teams.open();
      await expect(teams.memberRow(MEMBER_ROW.id)).toBeVisible();
    });

    await test.step("Stub team_members PATCH → 500 and change role via select", async () => {
      await page.route("**/rest/v1/team_members*", async (route) => {
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ code: "internal", message: "update failed" }),
          });
        } else {
          await route.fallback();
        }
      });
      await teams.memberRoleSelect(MEMBER_ROW.id).click();
      await teams.roleOption("Viewer").click();
    });

    await test.step("Verify error toast is visible", async () => {
      await expect(teams.updateRoleErrorToast).toBeVisible();
      await expect(teams.updateRoleErrorToast).toHaveText(
        "Zmenu roly sa nepodarilo uložiť. Skús to znova.",
      );
    });

    await test.step("Verify member row still shows the original member", async () => {
      await expect(teams.memberRow(MEMBER_ROW.id)).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// B. Templates (/app/templates)
// ---------------------------------------------------------------------------

test.describe("B. Templates — duplicate and delete failure paths", () => {
  // AA-03: duplicate failure shows the dialog error, dialog stays open, retry succeeds
  test("AA-03: duplicate failure shows error toast, dialog stays open; retry succeeds", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_PUBLIC] } });
    const templates = new AppTemplatesPage(page);

    await test.step("Open /app/templates and verify template card is present", async () => {
      await templates.open();
      await expect(templates.card(TPL_PUBLIC.id as string)).toBeVisible();
    });

    await test.step("Open the duplicate dialog via the action menu", async () => {
      await templates.actionMenuTrigger(TPL_PUBLIC.id as string).click();
      await templates.duplicateActionMenuItem(TPL_PUBLIC.id as string).click();
      await expect(templates.duplicateDialog).toBeVisible();
    });

    await test.step("Stub templates POST → 500 and click Duplikovať", async () => {
      await page.route("**/rest/v1/templates*", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ code: "internal", message: "insert failed" }),
          });
        } else {
          await route.fallback();
        }
      });
      await templates.duplicateConfirmButton.click();
    });

    await test.step("Verify error toast shows verbatim copy", async () => {
      await expect(templates.duplicateErrorToast).toBeVisible();
      await expect(templates.duplicateErrorToast).toHaveText(
        "Šablónu sa nepodarilo duplikovať. Skús to znova.",
      );
    });

    await test.step("Verify the duplicate dialog is still open", async () => {
      await expect(templates.duplicateDialog).toBeVisible();
    });

    await test.step("Re-stub templates POST → 201, retry — dialog closes", async () => {
      await page.route("**/rest/v1/templates*", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify([
              {
                ...TPL_MINE,
                id: "tpl_dup_new",
                title: "Onboarding kvíz (kópia)",
              },
            ]),
          });
        } else {
          await route.fallback();
        }
      });
      await templates.duplicateConfirmButton.click();
    });

    await test.step("Verify dialog is closed after success", async () => {
      await expect(templates.duplicateDialog).toHaveCount(0);
    });
  });

  // AA-04: delete failure keeps the template in the list and shows the error
  test("AA-04: delete failure shows error toast, template remains; retry removes it", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { templates: [TPL_MINE] } });
    const templates = new AppTemplatesPage(page);

    await test.step("Open the Mine tab and verify the owned template is visible", async () => {
      await templates.open();
      await templates.tabMine.click();
      await expect(templates.card(TPL_MINE.id as string)).toBeVisible();
    });

    await test.step("Open the delete dialog via the action menu", async () => {
      await templates.actionMenuTrigger(TPL_MINE.id as string).click();
      await templates.deleteActionMenuItem(TPL_MINE.id as string).click();
      await expect(templates.deleteDialog).toBeVisible();
    });

    await test.step("Stub templates DELETE → 500 and click Áno, vymazať", async () => {
      await page.route("**/rest/v1/templates*", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ code: "internal", message: "delete failed" }),
          });
        } else {
          await route.fallback();
        }
      });
      await templates.deleteConfirmButton.click();
    });

    await test.step("Verify error toast shows verbatim copy", async () => {
      await expect(templates.deleteErrorToast).toBeVisible();
      await expect(templates.deleteErrorToast).toHaveText(
        "Šablónu sa nepodarilo vymazať. Skús to znova.",
      );
    });

    await test.step("Verify the template row is still present in the list", async () => {
      await expect(templates.card(TPL_MINE.id as string)).toBeVisible();
    });

    await test.step("Re-stub DELETE → 204, open delete dialog again, confirm — template disappears", async () => {
      // The mockSupabase envelope serves seeded rows statically (DELETEs
      // don't mutate them), so the post-delete refetch must be stubbed to
      // the row-less list explicitly — same pattern as ERR-14.
      await page.route("**/rest/v1/templates*", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({ status: 204, body: "" });
        } else {
          await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
      });
      await templates.actionMenuTrigger(TPL_MINE.id as string).click();
      await templates.deleteActionMenuItem(TPL_MINE.id as string).click();
      await expect(templates.deleteDialog).toBeVisible();
      await templates.deleteConfirmButton.click();
      await expect(templates.card(TPL_MINE.id as string)).toHaveCount(0);
    });
  });
});

// ---------------------------------------------------------------------------
// C. Account (/app/account/profile — DSR/data export)
// ---------------------------------------------------------------------------

test.describe("C. Account — data export failure path", () => {
  // AA-05: data export failure shows the error state; retry recovers
  test("AA-05: export-data 500 shows error toast; re-stub → 200 shows success", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page);
    const account = new AppAccountProfilePage(page);

    await test.step("Open /app/account/profile and verify the export card is visible", async () => {
      await account.open();
      await expect(account.dataExportCard).toBeVisible();
      await expect(account.dataExportButton).toBeEnabled();
    });

    await test.step("Stub /api/account/export-data → 500 and click the export button", async () => {
      await page.route("**/api/account/export-data", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "internal" }),
        });
      });
      await account.dataExportButton.click();
    });

    await test.step("Verify generic error toast with verbatim copy", async () => {
      await expect(account.exportGenericErrorToast).toBeVisible();
      await expect(account.exportGenericErrorToast).toHaveText(
        "Export sa nepodaril. Skús to o chvíľu znova, alebo nám napíš na subenai.podpora@gmail.com.",
      );
    });

    await test.step("Verify the export button is re-enabled after failure", async () => {
      await expect(account.dataExportButton).toBeEnabled();
    });

    await test.step("Re-stub /api/account/export-data → 200 with minimal JSON body and click again", async () => {
      await page.route("**/api/account/export-data", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user_id: EDUCATOR_SESSION.user.id, records: {} }),
        });
      });
      await account.dataExportButton.click();
    });

    await test.step("Verify the generic error toast is gone and success state renders", async () => {
      await expect(account.exportGenericErrorToast).toHaveCount(0);
    });
  });
});

// ---------------------------------------------------------------------------
// E. Onboarding (/app first run)
// ---------------------------------------------------------------------------

test.describe("E. Onboarding — save failure path", () => {
  // AA-08: onboarding save failure shows an error and does NOT advance to /app
  test("AA-08: onboarding upsert 500 shows inline error, stays on onboarding; retry lands in /app", async ({
    context,
    page,
  }) => {
    await setupAppShell(context, page, {
      session: EDUCATOR_SESSION,
      onboarded: false,
    });

    const onboarding = new AppOnboardingPage(page);

    await test.step("Open /app/onboarding and verify the form renders", async () => {
      await onboarding.open();
      await expect(onboarding.root).toBeVisible();
      await expect(onboarding.form).toBeVisible();
    });

    await test.step("Stub profile_preferences POST → 500 and submit", async () => {
      await page.route("**/rest/v1/profile_preferences*", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ code: "internal_error", message: "upsert failed" }),
          });
        } else {
          await route.fallback();
        }
      });
      await onboarding.submitButton.click();
    });

    await test.step("Verify inline error message with verbatim copy", async () => {
      await expect(onboarding.errorMessage).toBeVisible();
      await expect(onboarding.errorMessage).toHaveText("Ukladanie zlyhalo. Skús to znovu.");
    });

    await test.step("Verify the user stayed on the onboarding page", async () => {
      await expect(page).toHaveURL(/\/app\/onboarding/);
    });

    await test.step("Re-stub profile_preferences POST → 201 and retry — navigates to /app", async () => {
      await page.route("**/rest/v1/profile_preferences*", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: "",
          });
        } else {
          await route.fallback();
        }
      });
      await onboarding.submitButton.click();
      await expect(page).toHaveURL(/\/app\/?(\?|$)/);
    });
  });
});
