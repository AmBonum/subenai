import { BasePage } from "../BasePage";

export class ForgotPasswordPage extends BasePage {
  static readonly PATH = "/forgot-password" as const;

  async open() {
    return this.goto(ForgotPasswordPage.PATH);
  }

  // ---- structural elements ----

  get card() {
    return this.page.getByTestId("forgot-card");
  }

  get heading() {
    return this.page.getByTestId("forgot-heading");
  }

  get form() {
    return this.page.getByTestId("forgot-form");
  }

  get successPanel() {
    return this.page.getByTestId("forgot-success-message");
  }

  // ---- form inputs ----

  get emailInput() {
    return this.page.getByTestId("forgot-email-input");
  }

  // ---- submit ----

  get submitButton() {
    return this.page.getByTestId("forgot-submit-button");
  }

  // ---- feedback ----

  get errorMessage() {
    return this.page.getByTestId("forgot-error-message");
  }

  // ---- head meta ----

  /**
   * Returns the content attribute of <meta name="robots"> or null if absent.
   * Uses evaluate (not a locator) because TanStack Start injects this tag
   * only in the SSR/wrangler context — Playwright's locator would time out
   * waiting for the element in the Vite dev environment.
   */
  async robotsMetaContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector("meta[name='robots']")?.getAttribute("content") ?? null,
    );
  }

  // ---- navigation links ----

  get backToLoginLink() {
    return this.page.getByTestId("forgot-back-to-login");
  }

  get successToLoginLink() {
    return this.page.getByTestId("forgot-success-to-login");
  }

  // ---- compound actions ----

  async fillEmail(value: string) {
    await this.emailInput.fill(value);
  }

  async fillAndSubmit(email: string) {
    await this.fillEmail(email);
    await this.submitButton.click();
  }
}
