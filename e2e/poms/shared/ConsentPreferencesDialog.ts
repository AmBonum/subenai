import type { Locator, Page } from "@playwright/test";

export type ConsentCategoryId = "necessary" | "preferences" | "analytics" | "marketing";

/**
 * Granular consent preferences dialog POM.
 *
 * Opened from the banner "Nastavenia" button or the footer
 * "Nastavenia cookies" button. All locators use `data-testid`
 * (added to ConsentPreferencesDialog.tsx in the same changeset).
 */
export class ConsentPreferencesDialog {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.getByTestId("consent-dialog-root");
  }

  toggle(categoryId: ConsentCategoryId): Locator {
    return this.page.getByTestId(`consent-dialog-toggle-${categoryId}`);
  }

  get saveButton(): Locator {
    return this.page.getByTestId("consent-dialog-save");
  }

  get rejectAllButton(): Locator {
    return this.page.getByTestId("consent-dialog-reject-all");
  }

  get acceptAllButton(): Locator {
    return this.page.getByTestId("consent-dialog-accept-all");
  }

  /**
   * The cookies-policy link inside the dialog description.
   * Clicking it closes the dialog via DialogClose and navigates to /cookies.
   */
  get cookiesLink(): Locator {
    return this.page.getByTestId("consent-dialog-cookies-link");
  }

  /**
   * The privacy-policy link inside the dialog description.
   * Clicking it closes the dialog via DialogClose and navigates to /privacy.
   */
  get privacyLink(): Locator {
    return this.page.getByTestId("consent-dialog-privacy-link");
  }

  /**
   * The "X" close button rendered by the shadcn DialogContent wrapper.
   * It has no call-site testid (the button is hardcoded inside the wrapper);
   * we locate it by its accessible name (sr-only "Zavrieť" in
   * src/components/ui/dialog.tsx) scoped to the dialog root.
   */
  get closeButton(): Locator {
    return this.root.getByRole("button", { name: "Zavrieť" });
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  async clickRejectAll(): Promise<void> {
    await this.rejectAllButton.click();
  }
}
