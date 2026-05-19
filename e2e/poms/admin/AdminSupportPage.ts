import { BasePage } from "../BasePage";

export class AdminSupportPage extends BasePage {
  static readonly PATH = "/admin/support" as const;

  async open() {
    return this.goto(AdminSupportPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-support-root");
  }

  get form() {
    return this.page.getByTestId("admin-support-form");
  }

  get emailInput() {
    return this.page.getByTestId("admin-support-email-input");
  }

  get phoneInput() {
    return this.page.getByTestId("admin-support-phone-input");
  }

  get hoursInput() {
    return this.page.getByTestId("admin-support-hours-input");
  }

  get submitButton() {
    return this.page.getByTestId("admin-support-submit");
  }

  get emailError() {
    return this.page.getByTestId("admin-support-email-error");
  }

  get phoneError() {
    return this.page.getByTestId("admin-support-phone-error");
  }

  get channelList() {
    return this.page.getByTestId("admin-support-channel-list");
  }

  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  async submit() {
    await this.submitButton.click();
  }
}
