import { BasePage } from "../BasePage";

export class AppLibraryPage extends BasePage {
  static readonly PATH = "/app/library" as const;

  async open() {
    return this.goto(AppLibraryPage.PATH);
  }

  get root() {
    return this.page.getByTestId("library-root");
  }

  get pageHeader() {
    return this.page.getByTestId("library-page-header");
  }

  get searchInput() {
    return this.page.getByTestId("library-search-input");
  }

  get branchFilter() {
    return this.page.getByTestId("library-branch-filter");
  }

  get difficultyFilter() {
    return this.page.getByTestId("library-difficulty-filter");
  }

  get emptyState() {
    return this.page.getByTestId("library-empty-state");
  }

  questionRow(id: string) {
    return this.page.getByTestId(`library-row-${id}`);
  }

  questionTypeBadge(id: string) {
    return this.page.getByTestId(`library-row-preview-${id}`);
  }

  get allRows() {
    return this.page.locator('[data-testid^="library-row-qp_"]');
  }

  get showingCapped() {
    return this.page.getByTestId("library-showing-capped");
  }

  /**
   * A Radix Select option in whichever filter dropdown is open (branch or
   * difficulty). SelectItem carries no testid, so role+name is the
   * locator (precedence #2).
   */
  filterOption(name: string) {
    return this.page.getByRole("option", { name, exact: true });
  }
}
