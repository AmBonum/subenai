import { BasePage } from "../BasePage";

export class AppTestsIndexPage extends BasePage {
  static readonly PATH = "/app/tests" as const;

  async open() {
    return this.goto(AppTestsIndexPage.PATH);
  }

  // ---- Page root ---------------------------------------------------------
  get root() {
    return this.page.getByTestId("tests-list-root");
  }

  // ---- Header actions ----------------------------------------------------
  get newTestButton() {
    return this.page.getByTestId("tests-list-new-test-button");
  }

  // ---- Filter toolbar ----------------------------------------------------
  get searchInput() {
    return this.page.getByTestId("tests-list-search-input");
  }

  get statusFilter() {
    return this.page.getByTestId("tests-list-status-filter");
  }

  statusTab(value: "all" | "published" | "draft" | "archived") {
    return this.statusFilter.getByRole("tab", {
      name: new RegExp(
        value === "draft"
          ? "Koncepty"
          : value === "published"
            ? "Publikované"
            : value === "archived"
              ? "Archív"
              : "Všetky",
        "i",
      ),
    });
  }

  get branchFilter() {
    return this.page.getByTestId("tests-list-branch-filter");
  }

  get clearFiltersButton() {
    return this.page.getByTestId("tests-list-clear-filters-button");
  }

  // ---- Empty states ------------------------------------------------------
  /** Filter-empty: tests exist but none match the active filters. */
  get emptyState() {
    return this.page.getByTestId("tests-list-empty-state");
  }

  get emptyStateClearFilters() {
    return this.page.getByTestId("tests-list-empty-state-clear-filters");
  }

  /** True-empty: the educator owns zero tests (first-run state). */
  get emptyInitial() {
    return this.page.getByTestId("tests-list-empty-initial");
  }

  get emptyInitialTitle() {
    return this.page.getByTestId("tests-list-empty-initial-title");
  }

  get emptyInitialCta() {
    return this.page.getByTestId("tests-list-empty-initial-cta");
  }

  // ---- List rows (parameterised by test id) ------------------------------
  listRow(id: string) {
    return this.page.getByTestId(`tests-list-row-${id}`);
  }

  rowTitle(id: string) {
    return this.page.getByTestId(`tests-list-row-title-${id}`);
  }

  rowOpenButton(id: string) {
    return this.page.getByTestId(`tests-list-row-open-${id}`);
  }

  rowShareButton(id: string) {
    return this.page.getByTestId(`tests-list-row-share-${id}`);
  }

  rowDuplicateButton(id: string) {
    return this.page.getByTestId(`tests-list-row-duplicate-${id}`);
  }

  rowDeleteButton(id: string) {
    return this.page.getByTestId(`tests-list-row-delete-${id}`);
  }

  rowAudienceBadge(id: string) {
    return this.page.getByTestId(`tests-list-row-audience-${id}`);
  }

  // ---- Delete ConfirmDialog (shared app-shell dialog) ----------------------
  get confirmDialog() {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogTypedInput() {
    return this.page.getByTestId("app-shell-confirm-dialog-typed-input");
  }

  get confirmDialogConfirm() {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  get confirmDialogCancel() {
    return this.page.getByTestId("app-shell-confirm-dialog-cancel");
  }

  /** First sonner toast — duplicate/delete success + error feedback. */
  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  // ---- All list row cards (for counting) ---------------------------------
  get allListRows() {
    return this.page.locator(
      '[data-testid^="tests-list-row-"]:not([data-testid*="-open-"]):not([data-testid*="-share-"]):not([data-testid*="-title-"])',
    );
  }
}
