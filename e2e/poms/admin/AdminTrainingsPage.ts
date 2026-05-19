import { BasePage } from "../BasePage";

export class AdminTrainingsPage extends BasePage {
  static readonly PATH = "/admin/trainings" as const;

  async open() {
    return this.goto(AdminTrainingsPage.PATH);
  }

  // ---- Page shell ----------------------------------------------------------

  get root() {
    return this.page.getByTestId("admin-trainings-root");
  }

  // ---- Toolbar -------------------------------------------------------------

  get newButton() {
    return this.page.getByTestId("admin-trainings-list-new-button");
  }

  get searchInput() {
    return this.page.getByTestId("admin-trainings-list-search");
  }

  // ---- List / empty state --------------------------------------------------

  get emptyState() {
    return this.page.getByTestId("admin-trainings-list-empty-state");
  }

  row(id: string) {
    return this.page.getByTestId(`admin-trainings-list-row-${id}`);
  }

  rowEditButton(id: string) {
    return this.page.getByTestId(`admin-trainings-row-edit-${id}`);
  }

  rowDuplicateButton(id: string) {
    return this.page.getByTestId(`admin-trainings-row-duplicate-${id}`);
  }

  rowDeleteButton(id: string) {
    return this.page.getByTestId(`admin-trainings-row-delete-${id}`);
  }

  // ---- TrainingEditor sheet ------------------------------------------------

  get editorTitleInput() {
    return this.page.getByTestId("training-editor-title-input");
  }

  get editorSaveButton() {
    return this.page.getByTestId("training-editor-save-button");
  }

  get editorCancelButton() {
    return this.page.getByTestId("training-editor-cancel-button");
  }

  // ---- Actions -------------------------------------------------------------

  async openNewEditor() {
    await this.newButton.click();
    await this.editorTitleInput.waitFor({ state: "visible" });
  }

  async cancelEditor() {
    await this.editorCancelButton.click();
    await this.editorTitleInput.waitFor({ state: "hidden" });
  }
}
