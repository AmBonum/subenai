import { BasePage } from "../BasePage";

/** POM for the respondent intake form on /test/builder/$id */
export class IntakeFormPage extends BasePage {
  async open(setId: string) {
    return this.goto(`/test/builder/${setId}`);
  }

  // ── Form elements ────────────────────────────────────────────────────────────

  get formRoot() {
    return this.page.getByTestId("intake-form-root");
  }

  get disclosure() {
    return this.page.getByTestId("intake-form-disclosure");
  }

  get nameInput() {
    return this.page.getByTestId("intake-form-name-input");
  }

  get emailInput() {
    return this.page.getByTestId("intake-form-email-input");
  }

  get consentCheckbox() {
    return this.page.getByTestId("intake-form-consent-checkbox");
  }

  get submitButton() {
    return this.page.getByTestId("intake-form-submit-button");
  }

  get errorMessage() {
    return this.page.getByTestId("intake-form-error-message");
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async checkConsent() {
    await this.consentCheckbox.check();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async fillAndSubmit(opts: { name: string; email: string }) {
    await this.fillName(opts.name);
    await this.fillEmail(opts.email);
    await this.checkConsent();
    await this.clickSubmit();
  }
}
