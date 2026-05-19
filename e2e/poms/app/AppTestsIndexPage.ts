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
          ? "Drafty"
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

  // ---- Empty state -------------------------------------------------------
  get emptyState() {
    return this.page.getByTestId("tests-list-empty-state");
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

  // ---- All list row cards (for counting) ---------------------------------
  get allListRows() {
    return this.page.locator(
      '[data-testid^="tests-list-row-"]:not([data-testid*="-open-"]):not([data-testid*="-share-"]):not([data-testid*="-title-"])',
    );
  }
}
