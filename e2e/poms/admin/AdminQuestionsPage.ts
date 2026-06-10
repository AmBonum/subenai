import { BasePage } from "../BasePage";

export class AdminQuestionsPage extends BasePage {
  static readonly PATH = "/admin/questions" as const;

  async open() {
    return this.goto(AdminQuestionsPage.PATH);
  }

  // ---- Page shell ----------------------------------------------------------

  get root() {
    return this.page.getByTestId("admin-questions-root");
  }

  // ---- Toolbar -------------------------------------------------------------

  get newButton() {
    return this.page.getByTestId("admin-questions-new-button");
  }

  get exportButton() {
    return this.page.getByTestId("admin-questions-export-button");
  }

  get searchInput() {
    return this.page.getByTestId("admin-questions-search-input");
  }

  get statusFilter() {
    return this.page.getByTestId("admin-questions-status-filter");
  }

  get branchFilter() {
    return this.page.getByTestId("admin-questions-branch-filter");
  }

  get moreFiltersButton() {
    return this.page.getByTestId("admin-questions-more-filters-button");
  }

  get clearFiltersButton() {
    return this.page.getByTestId("admin-questions-clear-filters-button");
  }

  /**
   * A Radix Select option in the open filter dropdown (status or branch).
   * SelectItem carries no testid, so role+name is the locator
   * (precedence #2).
   */
  filterOption(name: string) {
    return this.page.getByRole("option", { name });
  }

  // ---- Table ---------------------------------------------------------------

  get emptyState() {
    return this.page.getByTestId("admin-questions-empty-state");
  }

  get paginationSummary() {
    return this.page.getByTestId("admin-questions-pagination-summary");
  }

  listRow(id: string) {
    return this.page.getByTestId(`admin-questions-list-row-${id}`);
  }

  rowEditButton(id: string) {
    return this.page.getByTestId(`admin-questions-row-edit-${id}`);
  }

  rowMenuTrigger(id: string) {
    return this.page.getByTestId(`admin-questions-row-menu-${id}`);
  }

  rowDeleteItem(id: string) {
    return this.page.getByTestId(`admin-questions-row-delete-${id}`);
  }

  // ---- QuestionEditor dialog -----------------------------------------------

  get editorDialog() {
    return this.page.getByTestId("question-editor-dialog");
  }

  get editorDialogTitle() {
    return this.page.getByTestId("question-editor-title");
  }

  get editorTitleInput() {
    return this.page.getByTestId("question-editor-title-input");
  }

  get editorExcerptInput() {
    return this.page.getByTestId("question-editor-excerpt-input");
  }

  get editorStatusSelect() {
    return this.page.getByTestId("question-editor-status-select");
  }

  get editorLocaleTabs() {
    return this.page.getByTestId("question-editor-locale-tabs");
  }

  editorTab(locale: "sk" | "en" | "cs") {
    return this.page.getByTestId(`question-editor-tab-${locale}`);
  }

  editorTabStatus(locale: "sk" | "en" | "cs") {
    return this.page.getByTestId(`question-editor-tab-status-${locale}`);
  }

  get editorBodySk() {
    return this.page.getByTestId("question-editor-body-input");
  }

  get editorBodyEn() {
    return this.page.getByTestId("question-editor-body-en-input");
  }

  get editorBodyCs() {
    return this.page.getByTestId("question-editor-body-cs-input");
  }

  get editorSaveButton() {
    return this.page.getByTestId("question-editor-save-button");
  }

  editorCorrectOption(answerId: string) {
    return this.page.getByTestId(`question-editor-correct-option-${answerId}`);
  }

  editorIncorrectOption(answerId: string) {
    return this.page.getByTestId(`question-editor-incorrect-option-${answerId}`);
  }

  get editorCancelButton() {
    return this.page.getByTestId("question-editor-cancel-button");
  }

  // ---- ConfirmDialog -------------------------------------------------------

  get confirmDialog() {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogTitle() {
    return this.page.getByTestId("app-shell-confirm-dialog-title");
  }

  get confirmDialogDescription() {
    return this.page.getByTestId("app-shell-confirm-dialog-description");
  }

  get confirmDialogConfirm() {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  get confirmDialogCancel() {
    return this.page.getByTestId("app-shell-confirm-dialog-cancel");
  }

  // ---- Actions -------------------------------------------------------------

  async openNewEditor() {
    await this.newButton.click();
    await this.editorDialog.waitFor({ state: "visible" });
  }

  async openEditorForRow(id: string) {
    await this.rowEditButton(id).click();
    await this.editorDialog.waitFor({ state: "visible" });
  }

  async openRowMenu(id: string) {
    await this.rowMenuTrigger(id).click();
  }

  async clickRowDeleteItem(id: string) {
    await this.rowDeleteItem(id).click();
  }

  async dismissEditor() {
    await this.editorCancelButton.click();
    await this.editorDialog.waitFor({ state: "hidden" });
  }
}
