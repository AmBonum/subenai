import { BasePage } from "../BasePage";

export class AdminShareCardPage extends BasePage {
  static readonly PATH = "/admin/share-card" as const;

  async open() {
    return this.goto(AdminShareCardPage.PATH);
  }

  get root() {
    return this.page.getByTestId("share-card-config-root");
  }

  get ogTemplateInput() {
    return this.page.getByTestId("share-card-config-og-template-url");
  }

  get titleFallbackInput() {
    return this.page.getByTestId("share-card-config-title-fallback");
  }

  get descriptionFallbackTextarea() {
    return this.page.getByTestId("share-card-config-description-fallback");
  }

  get preview() {
    return this.page.getByTestId("share-card-config-preview");
  }

  get titleError() {
    return this.page.getByTestId("share-card-config-title-error");
  }

  get saveButton() {
    return this.page.getByTestId("share-card-config-form-save");
  }

  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  async submit() {
    await this.saveButton.click();
  }
}
