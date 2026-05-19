import { BasePage } from "../BasePage";

export class AdminTestsIndexPage extends BasePage {
  static readonly PATH = "/admin/tests" as const;

  async open() {
    return this.goto(AdminTestsIndexPage.PATH);
  }

  // ---- Page shell ----------------------------------------------------------

  get root() {
    return this.page.getByTestId("admin-tests-list-root");
  }

  // ---- Toolbar -------------------------------------------------------------

  get searchInput() {
    return this.page.getByTestId("admin-tests-list-search");
  }

  get statusFilter() {
    return this.page.getByTestId("admin-tests-list-status-filter");
  }

  get difficultyFilter() {
    return this.page.getByTestId("admin-tests-list-difficulty-filter");
  }

  get branchFilter() {
    return this.page.getByTestId("admin-tests-list-branch-filter");
  }

  get ownerFilter() {
    return this.page.getByTestId("admin-tests-list-owner-filter");
  }

  get clearFiltersButton() {
    return this.page.getByTestId("admin-tests-list-clear-filters");
  }

  get bulkDeleteButton() {
    return this.page.getByTestId("admin-tests-list-bulk-delete-button");
  }

  // ---- Empty / loading / error states -------------------------------------

  get emptyState() {
    return this.page.getByTestId("admin-tests-list-empty-state");
  }

  get loadingState() {
    return this.page.getByTestId("admin-tests-list-loading");
  }

  get errorState() {
    return this.page.getByTestId("admin-tests-list-error");
  }

  // ---- Table rows (parameterised by test id) --------------------------------

  listRow(id: string) {
    return this.page.getByTestId(`admin-tests-list-row-${id}`);
  }

  rowTitle(id: string) {
    return this.page.getByTestId(`admin-tests-list-row-title-${id}`);
  }

  rowCheckbox(id: string) {
    return this.page.getByTestId(`admin-tests-list-row-checkbox-${id}`);
  }

  rowOpenButton(id: string) {
    return this.page.getByTestId(`admin-tests-row-open-${id}`);
  }

  rowDeleteButton(id: string) {
    return this.page.getByTestId(`admin-tests-row-delete-${id}`);
  }

  rowStatusBadge(id: string) {
    return this.listRow(id).getByTestId("admin-status-badge");
  }

  // ---- Select-all checkbox -------------------------------------------------

  get selectAllCheckbox() {
    return this.page.getByTestId("admin-tests-list-select-all-checkbox");
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
}
