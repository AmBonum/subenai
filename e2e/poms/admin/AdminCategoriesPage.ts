import { BasePage } from "../BasePage";

export class AdminCategoriesPage extends BasePage {
  static readonly PATH = "/admin/categories" as const;

  async open() {
    return this.goto(AdminCategoriesPage.PATH);
  }

  // ---- Page shell ----------------------------------------------------------

  get root() {
    return this.page.getByTestId("admin-categories-root");
  }

  // ---- Branches section ----------------------------------------------------

  get newBranchButton() {
    return this.page.getByTestId("admin-categories-new-branch-button");
  }

  get branchesList() {
    return this.page.getByTestId("admin-categories-branches-list");
  }

  branchRow(id: string) {
    return this.page.getByTestId(`admin-categories-branch-row-${id}`);
  }

  branchRowEditButton(id: string) {
    return this.page.getByTestId(`admin-categories-branch-row-edit-${id}`);
  }

  branchRowDeleteButton(id: string) {
    return this.page.getByTestId(`admin-categories-branch-row-delete-${id}`);
  }

  // ---- Topics section ------------------------------------------------------

  get newTopicButton() {
    return this.page.getByTestId("admin-categories-new-topic-button");
  }

  get topicsList() {
    return this.page.getByTestId("admin-categories-topics-list");
  }

  topicRow(id: string) {
    return this.page.getByTestId(`admin-categories-topic-row-${id}`);
  }

  topicRowEditButton(id: string) {
    return this.page.getByTestId(`admin-categories-topic-row-edit-${id}`);
  }

  topicRowDeleteButton(id: string) {
    return this.page.getByTestId(`admin-categories-topic-row-delete-${id}`);
  }

  // ---- Create/edit dialog --------------------------------------------------

  get dialogNameInput() {
    return this.page.getByTestId("category-dialog-name-input");
  }

  get dialogSaveButton() {
    return this.page.getByTestId("category-dialog-save-button");
  }

  get dialogCancelButton() {
    return this.page.getByTestId("category-dialog-cancel-button");
  }

  get dialogBranchSelect() {
    return this.page.getByTestId("category-dialog-branch-select");
  }

  // ---- ConfirmDialog -------------------------------------------------------

  get confirmDialog() {
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

  // ---- Delete error card ---------------------------------------------------

  get deleteErrorCard() {
    return this.page.getByTestId("admin-categories-delete-error");
  }

  // ---- Actions -------------------------------------------------------------

  async openNewBranchDialog() {
    await this.newBranchButton.click();
    await this.dialogNameInput.waitFor({ state: "visible" });
  }

  async openNewTopicDialog() {
    await this.newTopicButton.click();
    await this.dialogNameInput.waitFor({ state: "visible" });
  }

  async openEditBranchDialog(id: string) {
    await this.branchRowEditButton(id).click();
    await this.dialogNameInput.waitFor({ state: "visible" });
  }

  async openEditTopicDialog(id: string) {
    await this.topicRowEditButton(id).click();
    await this.dialogNameInput.waitFor({ state: "visible" });
  }

  async saveDialog() {
    await this.dialogSaveButton.click();
    await this.dialogNameInput.waitFor({ state: "hidden" });
  }

  async cancelDialog() {
    await this.dialogCancelButton.click();
    await this.dialogNameInput.waitFor({ state: "hidden" });
  }
}
