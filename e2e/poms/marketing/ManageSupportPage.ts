import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * POM for the /manage-support page (E11.4 — self-service Stripe portal link).
 *
 * Locator strategy: data-testid first (§ Test IDs in CLAUDE.md).
 * No assertions here — all `expect(...)` calls live in the spec.
 */
export class ManageSupportPage extends BasePage {
  static readonly PATH = "/manage-support" as const;

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(ManageSupportPage.PATH);
  }

  // ---------------------------------------------------------------------------
  // Structural
  // ---------------------------------------------------------------------------

  get backLink(): Locator {
    return this.page.getByTestId("manage-support-back-link");
  }

  get heading(): Locator {
    return this.page.getByTestId("manage-support-heading");
  }

  // ---------------------------------------------------------------------------
  // Form elements
  // ---------------------------------------------------------------------------

  get emailInput(): Locator {
    return this.page.getByTestId("manage-support-email-input");
  }

  get antiEnumHint(): Locator {
    return this.page.getByTestId("manage-support-anti-enum-hint");
  }

  get submitButton(): Locator {
    return this.page.getByTestId("manage-support-submit-button");
  }

  get errorAlert(): Locator {
    return this.page.getByTestId("manage-support-error-alert");
  }

  // ---------------------------------------------------------------------------
  // Submitted state
  // ---------------------------------------------------------------------------

  get submittedSection(): Locator {
    return this.page.getByTestId("manage-support-submitted-section");
  }

  get submittedHeading(): Locator {
    return this.submittedSection.getByRole("heading", { name: /Skontroluj e-mail/i });
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  async submitButtonHeight(): Promise<number> {
    const box = await this.submitButton.boundingBox();
    return box?.height ?? 0;
  }

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
