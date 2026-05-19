import { BasePage } from "../BasePage";

export class AppAudiencesPage extends BasePage {
  static readonly PATH = "/app/audiences" as const;

  async open() {
    return this.goto(AppAudiencesPage.PATH);
  }

  // ---- Page root ---------------------------------------------------------
  get root() {
    return this.page.getByTestId("audiences-root");
  }

  // ---- Header actions ----------------------------------------------------
  get newGroupButton() {
    return this.page.getByTestId("audiences-new-group-button");
  }

  // ---- Empty state -------------------------------------------------------
  get emptyState() {
    return this.page.getByTestId("audiences-empty-state");
  }

  // ---- List rows (parameterised by audience id) -------------------------
  listRow(id: string) {
    return this.page.getByTestId(`audiences-list-row-${id}`);
  }

  rowName(id: string) {
    return this.page.getByTestId(`audiences-row-name-${id}`);
  }

  rowMembers(id: string) {
    return this.page.getByTestId(`audiences-row-members-${id}`);
  }

  rowEditButton(id: string) {
    return this.page.getByTestId(`audiences-row-edit-${id}`);
  }

  rowDeleteButton(id: string) {
    return this.page.getByTestId(`audiences-row-delete-${id}`);
  }

  // ---- Inline editor -----------------------------------------------------
  get editorRoot() {
    return this.page.getByTestId("audiences-editor-root");
  }

  get editorNameInput() {
    return this.page.getByTestId("audiences-editor-name-input");
  }

  get editorTagInput() {
    return this.page.getByTestId("audiences-editor-tag-input");
  }

  editorTagRemoveButton(tag: string) {
    return this.page.getByTestId(`audiences-editor-tag-remove-${tag}`);
  }

  get editorSaveButton() {
    return this.page.getByTestId("audiences-editor-save-button");
  }

  get editorCancelButton() {
    return this.page.getByTestId("audiences-editor-cancel-button");
  }

  // ---- All list row cards (for counting) ---------------------------------
  get allListRows() {
    return this.page.locator('[data-testid^="audiences-list-row-"]');
  }

  // ---- Confirm dialog (shared ConfirmDialog component) ------------------
  get confirmDialogRoot() {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogTitle() {
    return this.page.getByTestId("app-shell-confirm-dialog-title");
  }

  get confirmDialogConfirm() {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  get confirmDialogCancel() {
    return this.page.getByTestId("app-shell-confirm-dialog-cancel");
  }
}
