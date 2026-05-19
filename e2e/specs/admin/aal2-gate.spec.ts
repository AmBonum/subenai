import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_AAL1_SESSION, EDUCATOR_SESSION } from "../../fixtures/auth";
import { AdminAal2GatePage } from "../../poms/admin/AdminAal2GatePage";

// Security canary: /admin/* must require (authenticated + admin role + AAL2).
// Any regression that silently bypasses one of these three gates exposes the
// admin interface to an unprivileged or under-authenticated session.

test.describe("/admin AAL2 gate — privilege escalation prevention", () => {
  // TC-01: no session at all — this path needs no auth seed, so no beforeEach.

  // TC-01: Unauthenticated visit to /admin redirects to /login
  test("TC-01: unauthenticated visit to /admin redirects to /login", async ({ page }) => {
    const gate = new AdminAal2GatePage(page);

    await test.step("Navigate to /admin with no active session", async () => {
      await page.goto("/admin", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify redirect lands on /login", async () => {
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });

    await test.step("Verify admin shell is not rendered", async () => {
      await expect(gate.adminShellRoot).toBeHidden();
    });
  });

  // TC-02: AAL1 admin session (verified TOTP factor, AAL1) redirects to /login/verify-2fa
  test("TC-02: AAL1 admin with verified TOTP factor is redirected to /login/verify-2fa", async ({
    context,
    page,
  }) => {
    const gate = new AdminAal2GatePage(page);

    await test.step("Seed an admin-role session at AAL1 (step-up not yet performed)", async () => {
      await setupAppShell(context, page, { session: ADMIN_AAL1_SESSION });
    });

    await test.step("Navigate to /admin", async () => {
      await gate.open();
    });

    await test.step("Verify redirect lands on /login/verify-2fa", async () => {
      await expect(page).toHaveURL(/\/login\/verify-2fa/);
    });

    await test.step("Verify the redirect search param preserves /admin as the target", async () => {
      await expect(page).toHaveURL(/redirect=%2Fadmin/);
    });

    await test.step("Verify the 2FA challenge card is visible", async () => {
      await expect(gate.verifyTwoFaCard).toBeVisible();
    });

    await test.step("Verify admin shell is not rendered", async () => {
      await expect(gate.adminShellRoot).toBeHidden();
    });
  });

  // TC-03: Non-admin authenticated user redirected to /app
  test("TC-03: non-admin authenticated user is redirected to /app", async ({ context, page }) => {
    const gate = new AdminAal2GatePage(page);

    await test.step("Seed an educator-role session (has_role: admin = false)", async () => {
      await setupAppShell(context, page, { session: EDUCATOR_SESSION });
    });

    await test.step("Navigate to /admin", async () => {
      await gate.open();
    });

    await test.step("Verify redirect lands on /app", async () => {
      await expect(page).toHaveURL(/\/app(\?|\/|$)/);
    });

    await test.step("Verify admin shell is not rendered", async () => {
      await expect(gate.adminShellRoot).toBeHidden();
    });
  });
});
