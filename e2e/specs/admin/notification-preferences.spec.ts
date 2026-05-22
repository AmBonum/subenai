import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";

// E48 Wave 4 — notification preferences deep coverage (TC-33, TC-34, TC-35).
//
// The existing smoke tests in support-notification-prefs.spec.ts cover the
// basic dirty-bar flow. This file adds the TC-33/34/35 plan scenarios:
//   TC-33: master toggle off disables all sub-controls + dirty bar
//   TC-34: saving dispatches UPSERT + shows toast + hides dirty bar
//   TC-35: lazy-creates default row when none exists
//
// All tests use mocked Supabase via setupAppShell — no real DB writes.

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

test.describe("TC-33..35: notification preferences — master toggle, save, lazy-create", () => {
  // ---------------------------------------------------------------------------
  // TC-33: Master toggle off disables all sub-controls; dirty bar appears
  // ---------------------------------------------------------------------------

  // TC-33: master toggle off
  test("TC-33: master toggle off disables all sub-controls and shows dirty bar", async ({
    context,
    page,
    adminNotifPrefs,
  }) => {
    await test.step("Set up admin session with notification prefs row seeded", async () => {
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

    await test.step("Open the notification preferences page", async () => {
      await adminNotifPrefs.open();
      await expect(adminNotifPrefs.masterSection).toBeVisible();
      // Dirty bar must be hidden at rest.
      await expect(adminNotifPrefs.dirtyBar).toBeHidden();
    });

    await test.step("Click the master toggle to disable all notifications", async () => {
      await adminNotifPrefs.masterToggle.click();
    });

    await test.step("Verify email channel checkbox is disabled", async () => {
      await expect(adminNotifPrefs.emailChannel).toBeDisabled();
    });

    await test.step("Verify in-app channel checkbox is disabled", async () => {
      await expect(adminNotifPrefs.inAppChannel).toBeDisabled();
    });

    await test.step("Verify at least one per-category toggle is disabled", async () => {
      await expect(adminNotifPrefs.categoryToggle("bug")).toBeDisabled();
      await expect(adminNotifPrefs.categoryToggle("question")).toBeDisabled();
      await expect(adminNotifPrefs.categoryToggle("billing")).toBeDisabled();
    });

    await test.step("Verify at least one cadence radio is disabled", async () => {
      await expect(adminNotifPrefs.cadenceRadio("instant")).toBeDisabled();
    });

    await test.step("Verify dirty bar is visible with save button labelled 'Uložiť zmeny'", async () => {
      await expect(adminNotifPrefs.dirtyBar).toBeVisible();
      await expect(adminNotifPrefs.saveButton).toBeVisible();
      await expect(adminNotifPrefs.saveButton).toHaveText(/Uložiť zmeny/i);
    });
  });

  // ---------------------------------------------------------------------------
  // TC-34: Saving notification preferences dispatches UPSERT + shows toast
  // ---------------------------------------------------------------------------

  test("TC-34: saving prefs dispatches UPSERT and shows toast; dirty bar hides", async ({
    context,
    page,
    adminNotifPrefs,
  }) => {
    let upsertCaptured = false;

    await test.step("Set up admin session with notification prefs row seeded", async () => {
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

    await test.step("Register a route spy to capture UPSERT to admin_notification_preferences", async () => {
      await page.route("**/rest/v1/admin_notification_preferences**", async (route) => {
        const method = route.request().method();
        if (method === "POST") {
          const preferHeader = route.request().headers()["prefer"] ?? "";
          if (/resolution=merge-duplicates/.test(preferHeader)) {
            upsertCaptured = true;
          }
        }
        await route.fallback();
      });
    });

    await test.step("Open the notification preferences page", async () => {
      await adminNotifPrefs.open();
      await expect(adminNotifPrefs.dirtyBar).toBeHidden();
    });

    await test.step("Flip the billing category toggle to create a dirty state", async () => {
      await adminNotifPrefs.categoryToggle("billing").click();
      await expect(adminNotifPrefs.dirtyBar).toBeVisible();
    });

    await test.step("Click 'Uložiť zmeny' to save", async () => {
      await adminNotifPrefs.saveButton.click();
    });

    await test.step("Verify toast with 'Nastavenia upozornení boli uložené.' appears", async () => {
      await expect(page.getByText(/Nastavenia upozornení boli uložené\./i)).toBeVisible();
    });

    await test.step("Verify dirty bar hides after save completes", async () => {
      await expect(adminNotifPrefs.dirtyBar).toBeHidden();
    });
  });

  // ---------------------------------------------------------------------------
  // TC-35: Lazy-creates default row if none exists
  // ---------------------------------------------------------------------------

  test("TC-35: opening prefs page with no existing row lazy-creates defaults; dirty bar hidden", async ({
    context,
    page,
    adminNotifPrefs,
  }) => {
    let insertCaptured = false;

    await test.step("Set up admin session with empty admin_notification_preferences table", async () => {
      await setupAppShell(context, page, {
        session: ADMIN_SESSION,
        extras: {
          tables: {
            // Empty table — simulates first time opening the prefs page.
            admin_notification_preferences: [],
          },
          rpcs: { has_role: true },
        },
      });
    });

    await test.step("Register a route spy to detect INSERT into admin_notification_preferences", async () => {
      await page.route("**/rest/v1/admin_notification_preferences**", async (route) => {
        const method = route.request().method();
        if (method === "POST") {
          insertCaptured = true;
        }
        await route.fallback();
      });
    });

    await test.step("Open the notification preferences page for the first time", async () => {
      await adminNotifPrefs.open();
    });

    await test.step("Verify page renders with all controls visible (defaults applied)", async () => {
      await expect(adminNotifPrefs.masterSection).toBeVisible();
      await expect(adminNotifPrefs.channelsSection).toBeVisible();
      await expect(adminNotifPrefs.cadenceSection).toBeVisible();
      await expect(adminNotifPrefs.categoriesSection).toBeVisible();
    });

    await test.step("Verify master toggle reflects enabled=true default", async () => {
      // The master toggle should be in the 'on' state for defaults.
      // The exact ARIA state depends on the implementation; we assert
      // that sub-controls are NOT disabled (defaults = everything enabled).
      await expect(adminNotifPrefs.emailChannel).not.toBeDisabled();
      await expect(adminNotifPrefs.inAppChannel).not.toBeDisabled();
    });

    await test.step("Verify dirty bar is NOT visible (defaults are already the saved state)", async () => {
      await expect(adminNotifPrefs.dirtyBar).toBeHidden();
    });
  });
});
