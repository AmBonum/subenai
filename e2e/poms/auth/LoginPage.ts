import { BasePage } from "../BasePage";

export class LoginPage extends BasePage {
  static readonly PATH = "/login" as const;

  async open() {
    return this.goto(LoginPage.PATH);
  }

  async openWithReset() {
    return this.goto(`${LoginPage.PATH}?reset=1`);
  }

  // ---- structural elements ----

  get card() {
    return this.page.getByTestId("login-card");
  }

  get heading() {
    return this.page.getByTestId("login-heading");
  }

  get resetSuccessBanner() {
    return this.page.getByTestId("login-reset-success-banner");
  }

  // ---- form inputs ----

  get emailInput() {
    return this.page.getByTestId("login-email-input");
  }

  get passwordInput() {
    return this.page.getByTestId("login-password-input");
  }

  get submitButton() {
    return this.page.getByTestId("login-submit-button");
  }

  // ---- OAuth ----

  get googleButton() {
    return this.page.getByTestId("login-google-button");
  }

  // ---- feedback ----

  get errorMessage() {
    return this.page.getByTestId("login-error-message");
  }

  get oauthCollision() {
    return this.page.getByTestId("login-oauth-collision");
  }

  get oauthCollisionTitle() {
    return this.page.getByTestId("login-oauth-collision-title");
  }

  get oauthCollisionBody() {
    return this.page.getByTestId("login-oauth-collision-body");
  }

  get oauthCollisionGoogleButton() {
    return this.page.getByTestId("login-oauth-collision-google");
  }

  // ---- navigation links ----

  get forgotPasswordLink() {
    return this.page.getByTestId("login-forgot-password");
  }

  get toSignupLink() {
    return this.page.getByTestId("login-to-signup");
  }

  get backHomeLink() {
    return this.page.getByTestId("login-back-home");
  }

  // ---- compound actions ----

  async fillEmail(value: string) {
    await this.emailInput.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordInput.fill(value);
  }

  async fillAndSubmit(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitButton.click();
  }
}
