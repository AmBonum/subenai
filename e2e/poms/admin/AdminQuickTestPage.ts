import { BasePage } from "../BasePage";

export class AdminQuickTestPage extends BasePage {
  static readonly PATH = "/admin/quick-test" as const;

  async open() {
    return this.goto(AdminQuickTestPage.PATH);
  }

  get root() {
    return this.page.getByTestId("quick-test-config-root");
  }

  get form() {
    return this.page.getByTestId("quick-test-config-form");
  }

  get visibilityToggle() {
    return this.page.getByTestId("quick-test-visibility-toggle");
  }

  get titleInput() {
    return this.page.getByTestId("quick-test-title-input");
  }

  get descriptionInput() {
    return this.page.getByTestId("quick-test-description-input");
  }

  get branzaSelect() {
    return this.page.getByTestId("quick-test-branza-select");
  }

  get timeInput() {
    return this.page.getByTestId("quick-test-time-input");
  }

  get passInput() {
    return this.page.getByTestId("quick-test-pass-input");
  }

  get difficultySelect() {
    return this.page.getByTestId("quick-test-difficulty-select");
  }

  get saveButton() {
    return this.page.getByTestId("quick-test-save-button");
  }

  get questionListEmpty() {
    return this.page.getByTestId("quick-test-question-list-empty");
  }

  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  async submit() {
    await this.saveButton.click();
  }

  async selectBranza(value: string) {
    await this.branzaSelect.click();
    await this.page.getByRole("option", { name: value }).click();
  }
}
