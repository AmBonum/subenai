import { BasePage } from "../BasePage";

export class SignupPage extends BasePage {
  static readonly PATH = "/signup" as const;

  async open() {
    return this.goto(SignupPage.PATH);
  }

  // ---- structural elements ----

  get card() {
    return this.page.getByTestId("signup-card");
  }

  get heading() {
    return this.page.getByTestId("signup-heading");
  }

  get form() {
    return this.page.getByTestId("signup-form");
  }

  get successPanel() {
    return this.page.getByTestId("signup-success-message");
  }

  // ---- form inputs ----

  get emailInput() {
    return this.page.getByTestId("signup-email-input");
  }

  get passwordInput() {
    return this.page.getByTestId("signup-password-input");
  }

  get passwordConfirmInput() {
    return this.page.getByTestId("signup-password-confirm-input");
  }

  // ---- password strength ----

  get passwordStrength() {
    return this.page.getByTestId("signup-password-strength");
  }

  // ---- submit ----

  get submitButton() {
    return this.page.getByTestId("signup-submit-button");
  }

  // ---- OAuth ----

  get googleButton() {
    return this.page.getByTestId("signup-google-button");
  }

  // ---- feedback ----

  get errorMessage() {
    return this.page.getByTestId("signup-error-message");
  }

  // ---- navigation links ----

  get toLoginLink() {
    return this.page.getByTestId("signup-to-login");
  }

  get successToLoginLink() {
    return this.page.getByTestId("signup-success-to-login");
  }

  // ---- compound actions ----

  async fillEmail(value: string) {
    await this.emailInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async fillPasswordConfirm(value: string) {
    await this.passwordConfirmInput.fill(value);
  }

  async fillAndSubmit(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillPasswordConfirm(password);
    await this.submitButton.click();
  }
}
