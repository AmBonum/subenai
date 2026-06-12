import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminSettingsPage } from "../../poms/admin/AdminSettingsPage";

// E40 close-out — /admin/settings is a READ-ONLY GDPR/compliance
// dashboard (DPA flow state, draft watermark, template version,
// retention, sub-processor register, runbook links). The old
// placeholder form (feature flags + deferred toast) no longer exists.

test.describe("/admin/settings", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAdmin(context, page);
  });

  // TC-01: page renders root, read-only notice, and the DPA section rows
  test("TC-01: renders root, read-only notice, and all four DPA setting rows", async ({ page }) => {
    const settings = new AdminSettingsPage(page);

    await test.step("Navigate to /admin/settings", async () => {
      await settings.open();
    });

    await test.step("Verify the settings root is visible", async () => {
      await expect(settings.root).toBeVisible();
    });

    await test.step("Verify the read-only notice card is visible", async () => {
      await expect(settings.readonlyNotice).toBeVisible();
      await expect(settings.readonlyNotice).toContainText(
        "Tieto hodnoty sú nastavené pri build-time",
      );
    });

    await test.step("Verify the DPA section renders all four setting rows", async () => {
      await expect(settings.dpaSection).toBeVisible();
      await expect(settings.dpaRow("flow")).toBeVisible();
      await expect(settings.dpaRow("watermark")).toBeVisible();
      await expect(settings.dpaRow("version")).toBeVisible();
      await expect(settings.dpaRow("retention")).toBeVisible();
    });
  });

  // TC-02: sub-processor register lists the active third parties
  test("TC-02: sub-processor register lists Supabase, Cloudflare, and Resend", async ({ page }) => {
    const settings = new AdminSettingsPage(page);

    await test.step("Navigate to /admin/settings", async () => {
      await settings.open();
      await expect(settings.subprocessorsSection).toBeVisible();
    });

    await test.step("Verify the three active sub-processors render", async () => {
      await expect(settings.subprocessorsList).toBeVisible();
      await expect(settings.subprocessor("supabase-inc")).toBeVisible();
      await expect(settings.subprocessor("cloudflare-inc")).toBeVisible();
      await expect(settings.subprocessor("resend-inc")).toBeVisible();
    });
  });

  // TC-03: navigation links — notification prefs + runbook
  test("TC-03: notifications link navigates to /admin/settings/notifications; runbook link points at GitHub", async ({
    page,
  }) => {
    const settings = new AdminSettingsPage(page);

    await test.step("Navigate to /admin/settings", async () => {
      await settings.open();
    });

    await test.step("Verify the runbook link points at the E40 runbook on GitHub", async () => {
      await expect(settings.runbookSection).toBeVisible();
      await expect(settings.runbookLink).toHaveAttribute(
        "href",
        "https://github.com/AmBonum/subenai/blob/main/tasks/E40-runbook.md",
      );
    });

    await test.step("Click the notifications settings link", async () => {
      await expect(settings.notificationsSection).toBeVisible();
      await settings.notificationsLink.click();
    });

    await test.step("Verify navigation to the notification preferences page", async () => {
      await expect(page).toHaveURL(/\/admin\/settings\/notifications/);
    });
  });
});
