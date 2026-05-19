import { BasePage } from "../BasePage";

export class AdminHeaderPage extends BasePage {
  static readonly PATH = "/admin/header" as const;

  async open() {
    return this.goto(AdminHeaderPage.PATH);
  }

  get root() {
    return this.page.getByTestId("cms-header-form-root");
  }

  get form() {
    return this.page.getByTestId("cms-header-form");
  }

  get logoInput() {
    return this.page.getByTestId("cms-header-form-logo");
  }

  get ctaLabelInput() {
    return this.page.getByTestId("cms-header-form-cta-label");
  }

  get ctaUrlInput() {
    return this.page.getByTestId("cms-header-form-cta-url");
  }

  get mobileInput() {
    return this.page.getByTestId("cms-header-form-mobile");
  }

  get saveButton() {
    return this.page.getByTestId("cms-header-form-save");
  }

  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  async submit() {
    await this.saveButton.click();
  }
}
