import { BasePage } from "../BasePage";

export class ComposerPage extends BasePage {
  static readonly PATH = "/test/builder" as const;

  async open(queryString = "") {
    return this.goto(`${ComposerPage.PATH}${queryString}`);
  }

  // ── Page structure ──────────────────────────────────────────────────────────

  get heading() {
    return this.page.getByTestId("composer-page-heading");
  }

  get packChipsSection() {
    return this.page.getByTestId("composer-pack-chips");
  }

  get questionPickerSection() {
    return this.page.getByTestId("composer-question-picker");
  }

  get settingsSection() {
    return this.page.getByTestId("composer-settings");
  }

  // ── Notices ─────────────────────────────────────────────────────────────────

  get staleNotice() {
    return this.page.getByTestId("composer-stale-notice");
  }

  get staleDismissButton() {
    return this.page.getByTestId("composer-stale-dismiss");
  }

  get shareToast() {
    return this.page.getByTestId("composer-share-toast");
  }

  get errorAlert() {
    return this.page.getByTestId("composer-error-alert");
  }

  // ── Pack chips ───────────────────────────────────────────────────────────────

  packChip(slug: string) {
    return this.page.getByTestId(`composer-pack-chip-${slug}`);
  }

  async togglePackChip(slug: string) {
    await this.packChip(slug).click();
  }

  // ── Question picker ──────────────────────────────────────────────────────────

  get pickerSearch() {
    return this.page.getByTestId("composer-picker-search");
  }

  get pickerSelectedCount() {
    return this.page.getByTestId("composer-picker-selected-count");
  }

  questionCheckbox(questionId: string) {
    return this.page.locator(`#pick-${questionId}`);
  }

  // ── Actions region ───────────────────────────────────────────────────────────

  get actionsRegion() {
    return this.page.getByTestId("composer-actions-region");
  }

  get selectionSummary() {
    return this.page.getByTestId("composer-selection-summary");
  }

  get clearButton() {
    return this.page.getByTestId("composer-clear-button");
  }

  get runSelfButton() {
    return this.page.getByTestId("composer-run-self-button");
  }

  get submitButton() {
    return this.page.getByTestId("composer-submit-button");
  }

  get urlCopyButton() {
    return this.page.getByTestId("composer-url-copy-button");
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async dismissStaleNotice() {
    await this.staleDismissButton.click();
  }

  async clickRunSelf() {
    await this.runSelfButton.click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickUrlCopy() {
    await this.urlCopyButton.click();
  }
}
