import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

/** Public changelog page (`/changelog`). */
export class ChangelogPage extends BasePage {
  static readonly PATH = "/changelog" as const;

  async open(): Promise<void> {
    await this.goto(ChangelogPage.PATH);
  }

  /** The list of released versions. */
  get list(): Locator {
    return this.page.getByTestId("changelog-list");
  }
}
