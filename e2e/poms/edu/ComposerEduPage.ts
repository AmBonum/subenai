import { BasePage } from "../BasePage";

/** POM for the /test/builder composer surface with edu-mode controls. */
export class ComposerEduPage extends BasePage {
  static readonly PATH = "/test/builder" as const;

  async open() {
    return this.goto(ComposerEduPage.PATH);
  }

  // ── Pack chips / question selection ─────────────────────────────────────────

  get packChipsSection() {
    return this.page.getByTestId("composer-pack-chips");
  }

  /** First pack chip button — one click adds ≥5 questions when a pack is available. */
  get firstPackChipButton() {
    return this.packChipsSection.locator("button").first();
  }

  get selectionSummaryText() {
    return this.page.getByTestId("composer-selection-summary");
  }

  // ── Step 2 question picker (collapsed by default, E33 Phase 1) ──────────────

  get step2Toggle() {
    return this.page.getByTestId("composer-step-2-toggle");
  }

  get step2Picker() {
    return this.page.getByTestId("composer-step-2-picker");
  }

  /** Bank checkbox — `pick-<questionId>` is the QuestionPicker input id. */
  questionCheckbox(questionId: string) {
    return this.page.locator(`#pick-${questionId}`);
  }

  /**
   * Expand the picker and tick the given bank question IDs. Selection via
   * the bank works without any published platform pack, unlike pack chips.
   */
  async selectQuestions(questionIds: string[]) {
    await this.step2Toggle.click();
    await this.step2Picker.waitFor({ state: "visible" });
    for (const id of questionIds) {
      await this.questionCheckbox(id).click();
    }
  }

  // ── Edu settings section ────────────────────────────────────────────────────

  get eduSettingsSection() {
    return this.page.getByTestId("composer-edu-settings-section");
  }

  get eduToggle() {
    return this.page.getByTestId("edu-settings-toggle");
  }

  get eduPasswordInput() {
    return this.page.getByTestId("edu-settings-password-input");
  }

  get eduPasswordHint() {
    return this.page.getByTestId("edu-settings-password-hint");
  }

  // ── Actions region ──────────────────────────────────────────────────────────

  get submitButton() {
    return this.page.getByTestId("composer-submit-button");
  }

  get runSelfButton() {
    return this.page.getByTestId("composer-run-self-button");
  }

  // ── Success dialog ──────────────────────────────────────────────────────────

  get eduSuccessDialog() {
    return this.page.getByTestId("composer-edu-success-dialog");
  }

  get eduSuccessPublicLink() {
    return this.page.getByTestId("edu-success-public-link");
  }

  get eduSuccessResultsLink() {
    return this.page.getByTestId("edu-success-results-link");
  }

  get eduSuccessPasswordValue() {
    return this.page.getByTestId("edu-success-password-value");
  }

  get eduSuccessAckCheckbox() {
    return this.page.getByTestId("edu-success-ack-checkbox");
  }

  get eduSuccessCloseButton() {
    return this.page.getByTestId("edu-success-close-button");
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async enableEduToggle() {
    await this.eduToggle.click();
  }

  async typePassword(password: string) {
    await this.eduPasswordInput.fill(password);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async acknowledgeAndClose() {
    await this.eduSuccessAckCheckbox.check();
    await this.eduSuccessCloseButton.click();
  }
}
