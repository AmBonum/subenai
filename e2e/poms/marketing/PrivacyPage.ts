import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

/** Public privacy policy page (`/privacy`). */
export class PrivacyPage extends BasePage {
  static readonly PATH = "/privacy" as const;

  async open(): Promise<void> {
    await this.goto(PrivacyPage.PATH);
  }

  /** First content section — present once the policy has rendered. */
  get firstSection(): Locator {
    return this.page.getByTestId("privacy-section-s1");
  }
}
