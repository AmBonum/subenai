import { test, expect } from "../../../fixtures/base";
import { setupAppShell } from "../../../setup/app-shell";
import { ADMIN_AAL1_SESSION } from "../../../fixtures/auth";
import { AdminAal2GatePage } from "../../../poms/admin/AdminAal2GatePage";

// E48 security — /admin/tickets must inherit the global AAL2 gate.
// Traces TC-17 from specs/support/E48-security.md.
//
// The admin shell at /admin/* requires aal=aal2. /admin/tickets is a
// nested route under that shell — a regression that surfaces the route
// at aal1 would let a partially-authenticated admin browse the queue
// without completing the TOTP step-up.

test.describe("E48 security — /admin/tickets AAL2 gate", () => {
  test("TC-17: AAL1 admin session is redirected away from /admin/tickets to the 2FA challenge", async ({
    context,
    page,
    adminTicketsQueue,
  }) => {
    const gate = new AdminAal2GatePage(page);

    await test.step("Seed an admin-role session at AAL1 (TOTP not satisfied)", async () => {
      await setupAppShell(context, page, { session: ADMIN_AAL1_SESSION });
    });

    await test.step("Navigate directly to /admin/tickets", async () => {
      await page.goto("/admin/tickets", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify the redirect lands on /login/verify-2fa", async () => {
      await expect(page).toHaveURL(/\/login\/verify-2fa/);
    });

    await test.step("Verify the redirect search param preserves /admin/tickets", async () => {
      await expect(page).toHaveURL(/redirect=%2Fadmin%2Ftickets/);
    });

    await test.step("Verify the 2FA challenge card is visible", async () => {
      await expect(gate.verifyTwoFaCard).toBeVisible();
    });

    await test.step("Verify the admin tickets queue root is NOT rendered", async () => {
      await expect(adminTicketsQueue.root).toBeHidden();
    });
  });
});
