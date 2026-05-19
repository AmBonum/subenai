import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedNotification } from "../../seed";
import { AppNotificationsPage } from "../../poms/app/AppNotificationsPage";

test.describe("/app/notifications", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: {
        notifications: [
          seedNotification({
            user_id: EDUCATOR_SESSION.user.id,
            event_type: "new_respondent",
            title: "Nový respondent",
            body: "Test seed body",
            read_at: null,
          }),
        ],
      },
    });
  });

  test("renders the inbox list with mark-all action", async ({ page }) => {
    const notifs = new AppNotificationsPage(page);
    await notifs.open();
    await expect(notifs.list).toBeVisible();
    await expect(notifs.filterUnread).toBeVisible();
  });
});
