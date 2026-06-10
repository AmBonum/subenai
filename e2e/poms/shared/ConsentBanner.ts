import type { Locator, Page } from "@playwright/test";

/**
 * Cookie consent banner POM.
 *
 * All locators use `data-testid` (added to ConsentBanner.tsx in the same
 * changeset). Specs MUST NOT call page.locator / page.getByTestId directly.
 */
export class ConsentBanner {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.getByTestId("consent-banner-root");
  }

  get title(): Locator {
    return this.page.getByTestId("consent-banner-title");
  }

  get badge(): Locator {
    return this.page.getByTestId("consent-banner-badge");
  }

  get body(): Locator {
    return this.page.getByTestId("consent-banner-body");
  }

  get acceptAllButton(): Locator {
    return this.page.getByTestId("consent-banner-accept-all");
  }

  get rejectAllButton(): Locator {
    return this.page.getByTestId("consent-banner-reject-all");
  }

  get settingsButton(): Locator {
    return this.page.getByTestId("consent-banner-settings-button");
  }

  get cookiesLink(): Locator {
    return this.page.getByTestId("consent-banner-cookies-link");
  }

  get privacyLink(): Locator {
    return this.page.getByTestId("consent-banner-privacy-link");
  }

  /** Root of the granular preferences dialog the banner / footer opens. */
  get preferencesDialog(): Locator {
    return this.page.getByTestId("consent-dialog-root");
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async acceptAll(): Promise<void> {
    await this.acceptAllButton.click();
    await this.root.waitFor({ state: "hidden" });
  }

  async rejectAll(): Promise<void> {
    await this.rejectAllButton.click();
    await this.root.waitFor({ state: "hidden" });
  }

  async openPreferences(): Promise<void> {
    await this.settingsButton.click();
  }
}
