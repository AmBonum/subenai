import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedNotification } from "../../seed";
import { AppNotificationsPage } from "../../poms/app/AppNotificationsPage";

const UID = EDUCATOR_SESSION.user.id;

test.describe("/app/notifications", () => {
  // TC-01: Empty state
  test("TC-01: empty state shows when no notifications are seeded", async ({ context, page }) => {
    await test.step("Set up educator session with no notifications", async () => {
      await setupEducator(context, page, { tables: { notifications: [] } });
    });

    const notifs = new AppNotificationsPage(page);

    await test.step("Navigate to /app/notifications", async () => {
      await notifs.open();
    });

    await test.step("Verify page root and header are visible", async () => {
      await expect(notifs.root).toBeVisible();
      await expect(notifs.header).toBeVisible();
    });

    await test.step('Verify empty-state paragraph shows "Žiadne notifikácie"', async () => {
      await expect(notifs.emptyState).toBeVisible();
      await expect(notifs.emptyState).toHaveText("Žiadne notifikácie");
    });

    await test.step("Verify the orienting hint under the empty state", async () => {
      await expect(notifs.emptyHint).toHaveText(
        "Tu uvidíš nové dokončenia testov a pripomienky retestov.",
      );
    });

    await test.step("Verify mark-all button is NOT rendered (no unread count)", async () => {
      await expect(notifs.markAll).toHaveCount(0);
    });
  });

  // TC-02: Unread notification renders title, badge, and unread dot
  test("TC-02: unread notification renders title, event-type badge, and unread dot", async ({
    context,
    page,
  }) => {
    const id = "notif_e2e_001";
    await test.step("Set up educator session with one unread notification", async () => {
      await setupEducator(context, page, {
        tables: {
          notifications: [
            seedNotification({
              id,
              user_id: UID,
              event_type: "new_respondent",
              title: "Nový respondent",
              body: "Test seed body",
              read_at: null,
            }),
          ],
        },
      });
    });

    const notifs = new AppNotificationsPage(page);

    await test.step("Navigate to /app/notifications", async () => {
      await notifs.open();
    });

    await test.step("Verify the notification row is visible", async () => {
      await expect(notifs.row(id)).toBeVisible();
    });

    await test.step("Verify the event-type badge shows 'new_respondent'", async () => {
      await expect(notifs.rowBadge(id)).toBeVisible();
      await expect(notifs.rowBadge(id)).toHaveText("new_respondent");
    });

    await test.step("Verify the title renders correctly", async () => {
      await expect(notifs.rowTitle(id)).toHaveText("Nový respondent");
    });

    await test.step("Verify the unread dot indicator is visible", async () => {
      await expect(notifs.rowUnreadDot(id)).toBeVisible();
    });

    await test.step("Verify the mark-read button is visible", async () => {
      await expect(notifs.markRead(id)).toBeVisible();
    });
  });

  // TC-03: Filter-unread toggle hides already-read notifications
  test("TC-03: filter-unread toggle shows only unread rows", async ({ context, page }) => {
    const unreadId = "notif_e2e_001";
    const readId = "notif_e2e_002";
    await test.step("Set up educator session with one unread and one read notification", async () => {
      await setupEducator(context, page, {
        tables: {
          notifications: [
            seedNotification({
              id: unreadId,
              user_id: UID,
              event_type: "new_respondent",
              title: "Nový respondent",
              read_at: null,
            }),
            seedNotification({
              id: readId,
              user_id: UID,
              event_type: "milestone",
              title: "Míľnik dosiahnutý",
              read_at: "2026-05-18T10:00:00.000Z",
            }),
          ],
        },
      });
    });

    const notifs = new AppNotificationsPage(page);

    await test.step("Navigate to /app/notifications", async () => {
      await notifs.open();
    });

    await test.step("Verify both rows are visible before toggling the filter", async () => {
      await expect(notifs.row(unreadId)).toBeVisible();
      await expect(notifs.row(readId)).toBeVisible();
    });

    await test.step('Click the "Iba neprečítané" filter button', async () => {
      await notifs.clickFilterUnread();
    });

    await test.step("Verify only the unread row remains visible", async () => {
      await expect(notifs.row(unreadId)).toBeVisible();
      await expect(notifs.row(readId)).toHaveCount(0);
    });

    await test.step("Click the filter button again to toggle off", async () => {
      await notifs.clickFilterUnread();
    });

    await test.step("Verify both rows are visible again after toggling off", async () => {
      await expect(notifs.row(unreadId)).toBeVisible();
      await expect(notifs.row(readId)).toBeVisible();
    });
  });

  // TC-04: Mark-one-as-read removes the unread dot and the mark-read button
  test("TC-04: clicking mark-read removes unread dot and button for that row", async ({
    context,
    page,
  }) => {
    const id = "notif_e2e_001";
    await test.step("Set up educator session with one unread notification", async () => {
      await setupEducator(context, page, {
        tables: {
          notifications: [
            seedNotification({
              id,
              user_id: UID,
              event_type: "anomaly",
              title: "Anomália detekovaná",
              read_at: null,
            }),
          ],
        },
      });
    });

    const notifs = new AppNotificationsPage(page);

    await test.step("Navigate to /app/notifications", async () => {
      await notifs.open();
    });

    await test.step("Verify unread dot and mark-read button are visible before action", async () => {
      await expect(notifs.rowUnreadDot(id)).toBeVisible();
      await expect(notifs.markRead(id)).toBeVisible();
    });

    await test.step('Click "Prečítané" button for the notification', async () => {
      await notifs.clickMarkRead(id);
    });

    await test.step("Verify unread dot and mark-read button are gone after marking read", async () => {
      await expect(notifs.rowUnreadDot(id)).toHaveCount(0);
      await expect(notifs.markRead(id)).toHaveCount(0);
    });

    await test.step("Verify the notification row itself is still visible (not deleted)", async () => {
      await expect(notifs.row(id)).toBeVisible();
    });
  });

  // TC-05: Mark-all-as-read bulk button clears all unread dots
  test("TC-05: mark-all-as-read hides unread dots and removes the bulk button", async ({
    context,
    page,
  }) => {
    const id1 = "notif_e2e_001";
    const id2 = "notif_e2e_002";
    await test.step("Set up educator session with two unread notifications", async () => {
      await setupEducator(context, page, {
        tables: {
          notifications: [
            seedNotification({
              id: id1,
              user_id: UID,
              event_type: "new_respondent",
              title: "Nový respondent",
              read_at: null,
            }),
            seedNotification({
              id: id2,
              user_id: UID,
              event_type: "milestone",
              title: "Míľnik dosiahnutý",
              read_at: null,
            }),
          ],
        },
      });
    });

    const notifs = new AppNotificationsPage(page);

    await test.step("Navigate to /app/notifications", async () => {
      await notifs.open();
    });

    await test.step("Verify both unread dots and mark-all button are visible", async () => {
      await expect(notifs.rowUnreadDot(id1)).toBeVisible();
      await expect(notifs.rowUnreadDot(id2)).toBeVisible();
      await expect(notifs.markAll).toBeVisible();
    });

    await test.step('Click "Označiť všetky ako prečítané"', async () => {
      await notifs.clickMarkAll();
    });

    await test.step("Verify both unread dots are gone", async () => {
      await expect(notifs.rowUnreadDot(id1)).toHaveCount(0);
      await expect(notifs.rowUnreadDot(id2)).toHaveCount(0);
    });

    await test.step("Verify mark-all button disappears (no unread remaining)", async () => {
      await expect(notifs.markAll).toHaveCount(0);
    });
  });
});
