import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminSettingsPage } from "../../poms/admin/AdminSettingsPage";

test.describe("/admin/settings", () => {
  // TC-01: Page renders the settings root, deferred notice, and all form sections
  test("TC-01: page renders root, deferred notice, and all form sections", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page);
    const settings = new AdminSettingsPage(page);

    await test.step("Navigate to /admin/settings", async () => {
      await settings.open();
    });

    await test.step("Verify the settings root is visible", async () => {
      await expect(settings.root).toBeVisible();
    });

    await test.step("Verify the deferred notice card is visible", async () => {
      await expect(settings.deferredNotice).toBeVisible();
    });

    await test.step("Verify the settings form is visible", async () => {
      await expect(settings.form).toBeVisible();
    });

    await test.step("Verify all three feature-flag switches are visible", async () => {
      await expect(settings.featureFlagSwitch("ai_generator")).toBeVisible();
      await expect(settings.featureFlagSwitch("audit_exports")).toBeVisible();
      await expect(settings.featureFlagSwitch("trap_popup")).toBeVisible();
    });

    await test.step("Verify the retention input is visible", async () => {
      await expect(settings.retentionInput).toBeVisible();
    });

    await test.step("Verify the primary-color input is visible", async () => {
      await expect(settings.primaryColorInput).toBeVisible();
    });

    await test.step("Verify the submit button is visible and enabled", async () => {
      await expect(settings.submitButton).toBeVisible();
      await expect(settings.submitButton).toBeEnabled();
    });
  });

  // TC-02: Submit fires the info toast
  test("TC-02: clicking the submit button shows the deferred-backend info toast", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page);
    const settings = new AdminSettingsPage(page);

    await test.step("Navigate to /admin/settings and confirm the form is visible", async () => {
      await settings.open();
      await expect(settings.form).toBeVisible();
    });

    await test.step('Click the submit button labelled "Uložiť"', async () => {
      await settings.submit();
    });

    await test.step("Verify the info toast appears within 4 s with the deferred-backend message", async () => {
      await expect(settings.toast).toBeVisible({ timeout: 4000 });
      await expect(settings.toast).toContainText(
        "Backend pre nastavenia ešte nie je nasadený, hodnoty sa neuložia po obnovení stránky.",
      );
    });
  });

  // TC-03: Toggle a feature flag switches the switch state
  test("TC-03: toggling the audit_exports switch changes its checked state", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page);
    const settings = new AdminSettingsPage(page);

    await test.step("Navigate to /admin/settings and confirm the form is visible", async () => {
      await settings.open();
      await expect(settings.form).toBeVisible();
    });

    await test.step("Verify audit_exports switch starts unchecked (default off)", async () => {
      await expect(settings.featureFlagSwitch("audit_exports")).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    await test.step("Click the audit_exports switch to turn it on", async () => {
      await settings.featureFlagSwitch("audit_exports").click();
    });

    await test.step("Verify audit_exports switch is now checked", async () => {
      await expect(settings.featureFlagSwitch("audit_exports")).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    await test.step("Click the audit_exports switch again to turn it off", async () => {
      await settings.featureFlagSwitch("audit_exports").click();
    });

    await test.step("Verify audit_exports switch returns to unchecked", async () => {
      await expect(settings.featureFlagSwitch("audit_exports")).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });
  });
});
