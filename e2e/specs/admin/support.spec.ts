import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedSupportTicket, supportTicketTables } from "../../seed";

// E48.6 — /admin/support is a back-compat redirect to /admin/tickets.
// The old support-channel config page was removed when the support IA
// merged into the tickets queue; old bookmarks and the /docs/admin/support
// references must keep landing on the queue.

test.describe("/admin/support → /admin/tickets redirect", () => {
  test("TC-01: /admin/support redirects to the tickets queue", async ({
    context,
    page,
    adminTicketsQueue,
  }) => {
    await setupAdmin(context, page, {
      tables: supportTicketTables([seedSupportTicket({ subject: "Redirect smoke ticket" })]),
    });

    await test.step("Navigate to the legacy /admin/support URL", async () => {
      await page.goto("/admin/support");
    });

    await test.step("Verify the URL was rewritten to /admin/tickets", async () => {
      await page.waitForURL(/\/admin\/tickets(\?|$)/);
    });

    await test.step("Verify the tickets queue renders", async () => {
      await expect(adminTicketsQueue.root).toBeVisible();
      await expect(adminTicketsQueue.table).toBeVisible();
    });
  });
});
