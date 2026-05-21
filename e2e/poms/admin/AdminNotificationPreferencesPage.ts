import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

export type SupportCategoryKey =
  | "bug"
  | "question"
  | "feature_request"
  | "abuse_report"
  | "billing"
  | "gdpr"
  | "other";

export type DigestCadence = "instant" | "hourly" | "daily" | "off";

/**
 * Admin self-service notification preferences (`/admin/settings/notifications`).
 * RLS scopes the row to the current admin only. The form is "dirty-state +
 * explicit save" — the bottom bar appears only when local state diverges
 * from the server snapshot.
 */
export class AdminNotificationPreferencesPage extends BasePage {
  static readonly PATH = "/admin/settings/notifications" as const;

  get root(): Locator {
    return this.page.getByTestId("admin-notif-root");
  }

  get loadingIndicator(): Locator {
    return this.page.getByTestId("admin-notif-loading");
  }

  get errorState(): Locator {
    return this.page.getByTestId("admin-notif-error");
  }

  // Sections ------------------------------------------------------------
  get masterSection(): Locator {
    return this.page.getByTestId("admin-notif-master-section");
  }

  get channelsSection(): Locator {
    return this.page.getByTestId("admin-notif-channels-section");
  }

  get cadenceSection(): Locator {
    return this.page.getByTestId("admin-notif-cadence-section");
  }

  get categoriesSection(): Locator {
    return this.page.getByTestId("admin-notif-categories-section");
  }

  // Controls ------------------------------------------------------------
  get masterToggle(): Locator {
    return this.page.getByTestId("admin-notif-master-toggle");
  }

  get emailChannel(): Locator {
    return this.page.getByTestId("admin-notif-channel-email");
  }

  get inAppChannel(): Locator {
    return this.page.getByTestId("admin-notif-channel-inapp");
  }

  cadenceRadio(cadence: DigestCadence): Locator {
    return this.page.getByTestId(`admin-notif-cadence-${cadence}`);
  }

  categoryToggle(cat: SupportCategoryKey): Locator {
    return this.page.getByTestId(`admin-notif-cat-${cat}-toggle`);
  }

  // Dirty bar -----------------------------------------------------------
  get dirtyBar(): Locator {
    return this.page.getByTestId("admin-notif-dirty-bar");
  }

  get saveButton(): Locator {
    return this.page.getByTestId("admin-notif-save");
  }

  get discardButton(): Locator {
    return this.page.getByTestId("admin-notif-discard");
  }

  async open(): Promise<void> {
    await this.goto(AdminNotificationPreferencesPage.PATH);
    await this.root.waitFor({ state: "visible" });
  }
}
