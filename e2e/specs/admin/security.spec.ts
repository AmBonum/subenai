import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminSecurityPage } from "../../poms/admin/AdminSecurityPage";

const BACKUP_CODES = [
  "a1b2c3d4-e5f60718",
  "b2c3d4e5-f6071829",
  "c3d4e5f6-0718293a",
  "d4e5f607-18293a4b",
  "e5f60718-293a4b5c",
  "f6071829-3a4b5c6d",
  "0718293a-4b5c6d7e",
  "18293a4b-5c6d7e8f",
];

function makeBackupRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `backup-${i + 1}`,
    user_id: "00000000-0000-0000-0000-000000000003",
    code_hash: `hash-${i + 1}`,
    used_at: null,
  }));
}

test.describe("/admin/security", () => {
  // TC-01: Security page renders overview cards with factor status and backup-code count
  test("TC-01: security page renders overview cards with factor status and backup-code count", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: {
        mfa_backup_codes: makeBackupRows(5),
      },
    });
    const security = new AdminSecurityPage(page);

    await test.step("Navigate to /admin/security", async () => {
      await security.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(security.root).toBeVisible();
    });

    await test.step("Verify the factor card is visible with friendly name and active status", async () => {
      await expect(security.factorCard).toBeVisible();
      await expect(security.factorFriendlyName).toBeVisible();
      await expect(security.factorFriendlyName).toContainText("primary");
      await expect(security.factorStatus).toHaveText("Aktívne");
    });

    await test.step("Verify the backup card shows the correct count with no warning", async () => {
      await expect(security.backupCard).toBeVisible();
      await expect(security.backupCount).toContainText("Zostáva 5 záložných kódov");
      await expect(security.backupWarning).toHaveCount(0);
    });

    await test.step("Verify the info card is visible", async () => {
      await expect(security.infoCard).toBeVisible();
    });
  });

  // TC-02: No-factor empty state shows enrollment CTA
  test("TC-02: no-factor empty state shows enrollment CTA and hides reset button", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: {
        mfa_backup_codes: [],
      },
    });
    // supabase.auth.mfa.listFactors() calls getUser() which reads the
    // `factors` array from /auth/v1/user — not /auth/v1/factors.
    // Override the user endpoint so the page sees no enrolled factor.
    // Playwright runs routes in reverse-registration order, so this route
    // intercepts before the one registered by primeAuthSession above.
    await page.route("**/auth/v1/user**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000003",
          email: "admin@e2e.test",
          aud: "authenticated",
          role: "authenticated",
          factors: [],
        }),
      });
    });
    const security = new AdminSecurityPage(page);

    await test.step("Navigate to /admin/security", async () => {
      await security.open();
    });

    await test.step("Verify the no-factor banner is visible", async () => {
      await expect(security.factorNone).toBeVisible();
    });

    await test.step("Verify the enrollment CTA link is visible and labelled correctly", async () => {
      await expect(security.factorNoneCta).toBeVisible();
      await expect(security.factorNoneCta).toContainText("Spustiť enrollment");
    });

    await test.step("Verify the reset button is not in the DOM", async () => {
      await expect(security.factorResetButton).toHaveCount(0);
    });
  });

  // TC-03: Backup-code regeneration flow reveals the new-codes panel
  test("TC-03: backup-code regeneration flow reveals the new-codes panel", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: {
        mfa_backup_codes: makeBackupRows(5),
      },
      rpcs: {
        generate_mfa_backup_codes: BACKUP_CODES,
      },
    });
    const security = new AdminSecurityPage(page);

    await test.step("Navigate to /admin/security", async () => {
      await security.open();
    });

    await test.step("Click the 'Vygenerovať nové záložné kódy' button", async () => {
      await expect(security.backupRegenButton).toBeVisible();
      await security.backupRegenButton.click();
    });

    await test.step("Verify the confirm dialog is visible with the correct title", async () => {
      await expect(security.confirmDialog).toBeVisible();
      await expect(security.confirmDialogTitle).toHaveText("Vygenerovať nové kódy?");
    });

    await test.step("Click the confirm button", async () => {
      await security.confirmDialogConfirm.click();
    });

    await test.step("Verify the new-codes panel is visible with the first code item", async () => {
      await expect(security.newCodesPanel).toBeVisible();
      await expect(security.newCodeItem("a1b2c3d4-e5f60718")).toBeVisible();
    });

    await test.step("Verify copy, download, and dismiss buttons are visible with correct labels", async () => {
      await expect(security.newCodesCopyButton).toBeVisible();
      await expect(security.newCodesCopyButton).toContainText("Skopírovať");
      await expect(security.newCodesDownloadButton).toBeVisible();
      await expect(security.newCodesDownloadButton).toContainText("Stiahnuť .txt");
      await expect(security.newCodesDismissButton).toBeVisible();
      await expect(security.newCodesDismissButton).toContainText("Hotovo");
    });
  });

  // TC-04: Low-backup warning renders when fewer than 3 codes remain
  test("TC-04: low-backup warning renders when fewer than 3 codes remain", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: {
        mfa_backup_codes: makeBackupRows(2),
      },
    });
    const security = new AdminSecurityPage(page);

    await test.step("Navigate to /admin/security", async () => {
      await security.open();
    });

    await test.step("Verify the backup count shows 2 remaining codes", async () => {
      await expect(security.backupCount).toContainText("Zostáva 2 záložných kódov");
    });

    await test.step("Verify the low-backup warning is visible with the correct message", async () => {
      await expect(security.backupWarning).toBeVisible();
      await expect(security.backupWarning).toContainText(
        "Máš málo nepoužitých kódov — odporúčame vygenerovať novú sadu.",
      );
    });
  });
});
