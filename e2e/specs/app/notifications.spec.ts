import { test, expect } from "@playwright/test";
import { AppNotificationsPage } from "../../poms/app/AppNotificationsPage";

test.describe("/app/notifications", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

  test("renders the inbox list with mark-all action", async ({ page }) => {
    const notifs = new AppNotificationsPage(page);
    await notifs.open();
    await expect(notifs.list).toBeVisible();
    await expect(notifs.filterUnread).toBeVisible();
  });
});
