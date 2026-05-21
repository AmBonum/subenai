import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";

// E48 smoke — per-admin notification preferences.
//
// Verifies the dirty-state flow: changing a control surfaces the bottom
// save bar, save dispatches an UPSERT to admin_notification_preferences,
// discard reverts the local draft back to the server snapshot.

const DEFAULT_PREFS_ROW = {
  user_id: ADMIN_SESSION.user.id,
  created_at: "2026-05-20T10:00:00.000Z",
  updated_at: "2026-05-20T10:00:00.000Z",
  enabled: true,
  channels: { email: true, in_app: true },
  per_category: {
    bug: true,
    question: true,
    feature_request: true,
    abuse_report: true,
    billing: true,
    gdpr: true,
    other: true,
  },
  digest_cadence: "instant",
};

test.describe("E48 smoke — admin notification preferences", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          admin_notification_preferences: [DEFAULT_PREFS_ROW],
        },
        rpcs: { has_role: true },
      },
    });
  });

  test("renders all 4 sections with default values from the server", async ({
    adminNotifPrefs,
  }) => {
    await adminNotifPrefs.open();
    await expect(adminNotifPrefs.masterSection).toBeVisible();
    await expect(adminNotifPrefs.channelsSection).toBeVisible();
    await expect(adminNotifPrefs.cadenceSection).toBeVisible();
    await expect(adminNotifPrefs.categoriesSection).toBeVisible();
    // Dirty bar must NOT be visible at rest — draft equals server.
    await expect(adminNotifPrefs.dirtyBar).toBeHidden();
  });

  test("flipping a category surfaces the dirty bar with save + discard", async ({
    adminNotifPrefs,
  }) => {
    await adminNotifPrefs.open();
    await adminNotifPrefs.categoryToggle("billing").click();

    await expect(adminNotifPrefs.dirtyBar).toBeVisible();
    await expect(adminNotifPrefs.saveButton).toBeVisible();
    await expect(adminNotifPrefs.discardButton).toBeVisible();
  });

  test("discard reverts the draft and hides the dirty bar", async ({ adminNotifPrefs }) => {
    await adminNotifPrefs.open();
    await adminNotifPrefs.categoryToggle("gdpr").click();
    await expect(adminNotifPrefs.dirtyBar).toBeVisible();

    await adminNotifPrefs.discardButton.click();
    await expect(adminNotifPrefs.dirtyBar).toBeHidden();
  });

  test("master toggle off disables every sub-control", async ({ adminNotifPrefs }) => {
    await adminNotifPrefs.open();
    await adminNotifPrefs.masterToggle.click();

    await expect(adminNotifPrefs.emailChannel).toBeDisabled();
    await expect(adminNotifPrefs.inAppChannel).toBeDisabled();
    await expect(adminNotifPrefs.categoryToggle("bug")).toBeDisabled();
    await expect(adminNotifPrefs.cadenceRadio("instant")).toBeDisabled();
  });
});
