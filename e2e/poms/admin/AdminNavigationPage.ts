import { BasePage } from "../BasePage";

export class AdminNavigationPage extends BasePage {
  static readonly PATH = "/admin/navigation" as const;

  async open() {
    return this.goto(AdminNavigationPage.PATH);
  }

  // ---- Page shell ----------------------------------------------------------

  get root() {
    return this.page.getByTestId("cms-nav-root");
  }

  get emptyState() {
    return this.page.getByTestId("cms-nav-empty");
  }

  get addButton() {
    return this.page.getByTestId("cms-nav-add-button");
  }

  // ---- Table rows ----------------------------------------------------------

  itemRow(id: string) {
    return this.page.getByTestId(`cms-nav-item-${id}`);
  }

  itemMoveUpButton(id: string) {
    return this.page.getByTestId(`cms-nav-item-${id}-move-up`);
  }

  itemMoveDownButton(id: string) {
    return this.page.getByTestId(`cms-nav-item-${id}-move-down`);
  }

  itemEditButton(id: string) {
    return this.page.getByTestId(`cms-nav-item-edit-${id}`);
  }

  itemDeleteButton(id: string) {
    return this.page.getByTestId(`cms-nav-item-delete-${id}`);
  }

  // ---- Editor dialog -------------------------------------------------------

  get dialog() {
    return this.page.getByTestId("cms-nav-item-form");
  }

  get dialogLabelInput() {
    return this.page.getByTestId("cms-nav-item-form-label");
  }

  get dialogUrlInput() {
    return this.page.getByTestId("cms-nav-item-form-url");
  }

  get dialogSaveButton() {
    return this.page.getByTestId("cms-nav-item-form-save");
  }

  get dialogCancelButton() {
    return this.page.getByTestId("cms-nav-item-form-cancel");
  }

  // ---- Actions -------------------------------------------------------------

  async openAddDialog() {
    await this.addButton.click();
    await this.dialog.waitFor({ state: "visible" });
  }

  async openEditDialog(id: string) {
    await this.itemEditButton(id).click();
    await this.dialog.waitFor({ state: "visible" });
  }

  async saveDialog() {
    await this.dialogSaveButton.click();
    await this.dialog.waitFor({ state: "hidden" });
  }

  async cancelDialog() {
    await this.dialogCancelButton.click();
    await this.dialog.waitFor({ state: "hidden" });
  }
}
