import { BasePage } from "../BasePage";

export class AppLegalDsrPage extends BasePage {
  static readonly PATH = "/app/legal/dsr" as const;

  async open() {
    return this.goto(AppLegalDsrPage.PATH);
  }

  // ---- Page chrome ---------------------------------------------------------
  get root() {
    return this.page.getByTestId("app-legal-dsr-root");
  }

  get title() {
    return this.page.getByTestId("app-legal-dsr-title");
  }

  get subtitle() {
    return this.page.getByTestId("app-legal-dsr-subtitle");
  }

  // ---- Submit form ---------------------------------------------------------
  get formCard() {
    return this.page.getByTestId("dsr-form-card");
  }

  get emailInput() {
    return this.page.getByTestId("dsr-form-subject-input");
  }

  get typeSelect() {
    return this.page.getByTestId("dsr-form-type-select");
  }

  typeOption(
    type: "access" | "rectification" | "erase" | "restriction" | "portability" | "objection",
  ) {
    return this.page.getByTestId(`dsr-form-type-option-${type}`);
  }

  get noteTextarea() {
    return this.page.getByTestId("dsr-form-details-textarea");
  }

  get submitButton() {
    return this.page.getByTestId("dsr-form-submit-button");
  }

  get successBanner() {
    return this.page.getByTestId("dsr-form-success-banner");
  }

  get errorBanner() {
    return this.page.getByTestId("dsr-form-error-banner");
  }

  // ---- History card --------------------------------------------------------
  get historyCard() {
    return this.page.getByTestId("app-legal-dsr-history-card");
  }

  get historyEmpty() {
    return this.page.getByTestId("app-legal-dsr-history-empty");
  }

  historyRow(id: string) {
    return this.page.getByTestId(`app-legal-dsr-history-row-${id}`);
  }
}
