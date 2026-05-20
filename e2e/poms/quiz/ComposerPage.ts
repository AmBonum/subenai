import { BasePage } from "../BasePage";

export class ComposerPage extends BasePage {
  static readonly PATH = "/test/builder" as const;

  async open(queryString = "") {
    return this.goto(`${ComposerPage.PATH}${queryString}`);
  }

  // ── Page structure ──────────────────────────────────────────────────────────

  get eyebrow() {
    return this.page.getByTestId("composer-page-eyebrow");
  }

  get heading() {
    return this.page.getByTestId("composer-page-heading");
  }

  get intro() {
    return this.page.getByTestId("composer-page-intro");
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

  // ── Phase 1 UX: collapsed-by-default picker (E33 Phase 1) ───────────────────

  /** Wrapper around the Step 2 question picker; renders the summary card. */
  get step2Wrapper() {
    return this.page.getByTestId("composer-step-2-wrapper");
  }

  /** Summary card visible when the picker is collapsed (count + CTA). */
  get step2Summary() {
    return this.page.getByTestId("composer-step-2-summary");
  }

  /** The "X otázok vybraných" / zero-state copy inside the summary card. */
  get step2SummaryText() {
    return this.page.getByTestId("composer-step-2-summary-text");
  }

  /** Expand/collapse toggle for the inline picker. */
  get step2Toggle() {
    return this.page.getByTestId("composer-step-2-toggle");
  }

  /** Full QuestionPicker, only rendered when the user expands. */
  get step2Picker() {
    return this.page.getByTestId("composer-step-2-picker");
  }

  // ── Phase 1 UX: composer explainer callout ──────────────────────────────────

  get explainer() {
    return this.page.getByTestId("composer-explainer");
  }

  get explainerToggle() {
    return this.page.getByTestId("composer-explainer-toggle");
  }

  get explainerBody() {
    return this.page.getByTestId("composer-explainer-body");
  }

  get explainerCustom() {
    return this.page.getByTestId("composer-explainer-custom");
  }

  get explainerPack() {
    return this.page.getByTestId("composer-explainer-pack");
  }

  /** Escape-hatch link from explainer body → /tests directory. */
  get explainerCtaToPacks() {
    return this.page.getByTestId("composer-explainer-cta-packs");
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

  /**
   * Expand the Step 2 picker. The picker is collapsed by default
   * (E33 Phase 1) so any test that asserts on QuestionPicker internals
   * (search input, checkboxes) must open it first.
   */
  async expandStep2Picker() {
    await this.step2Toggle.click();
    await this.step2Picker.waitFor({ state: "visible" });
  }

  /** Toggle the explainer callout open. */
  async expandExplainer() {
    await this.explainerToggle.click();
    await this.explainerBody.waitFor({ state: "visible" });
  }
}
