import { BasePage } from "../BasePage";

/**
 * Home page — the entry CTA for the anonymous quiz flow.
 *
 * Example POM showing the conventions:
 *   - getters for locators (lazy, can be re-evaluated after navigation)
 *   - methods for user-facing actions (one method = one user intent)
 *   - never mix locator definition with assertion logic — assertions
 *     live in spec files via `expect(...)`
 */
export class HomePage extends BasePage {
  static readonly PATH = "/" as const;

  get heading() {
    return this.page.getByRole("heading", { level: 1 }).first();
  }

  get heroHeading() {
    return this.page.getByTestId("home-hero-heading");
  }

  get startCta() {
    return this.page.getByRole("link", { name: /Spustiť test/i }).first();
  }

  async open() {
    return this.goto(HomePage.PATH);
  }

  async clickStart() {
    await this.startCta.click();
  }
}
