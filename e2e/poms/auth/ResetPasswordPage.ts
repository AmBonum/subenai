import { BasePage } from "../BasePage";

export class ResetPasswordPage extends BasePage {
  static readonly PATH = "/auth/reset-password" as const;

  async open() {
    return this.goto(ResetPasswordPage.PATH);
  }

  async openWithHash(hash: string) {
    return this.goto(`${ResetPasswordPage.PATH}${hash}`);
  }

  // ---- structural elements ----

  get card() {
    return this.page.getByTestId("reset-card");
  }

  get heading() {
    return this.page.getByTestId("reset-heading");
  }

  get form() {
    return this.page.getByTestId("reset-form");
  }

  get noSessionBlock() {
    return this.page.getByTestId("reset-no-session");
  }

  get toForgotLink() {
    return this.page.getByTestId("reset-to-forgot");
  }

  // ---- form inputs ----

  get passwordInput() {
    return this.page.getByTestId("reset-password-input");
  }

  get passwordConfirmInput() {
    return this.page.getByTestId("reset-password-confirm-input");
  }

  // ---- strength indicator ----

  get passwordStrength() {
    return this.page.getByTestId("reset-password-strength");
  }

  // ---- submit ----

  get submitButton() {
    return this.page.getByTestId("reset-submit-button");
  }

  // ---- feedback ----

  get errorMessage() {
    return this.page.getByTestId("reset-error-message");
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

  // ---- compound actions ----

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async fillPasswordConfirm(value: string) {
    await this.passwordConfirmInput.fill(value);
  }

  async fillBothAndSubmit(password: string) {
    await this.fillPassword(password);
    await this.fillPasswordConfirm(password);
    await this.submitButton.click();
  }
}
