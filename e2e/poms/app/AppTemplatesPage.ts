import { BasePage } from "../BasePage";

export class AppTemplatesPage extends BasePage {
  static readonly PATH = "/app/templates" as const;

  async open() {
    return this.goto(AppTemplatesPage.PATH);
  }

  get root() {
    return this.page.getByTestId("templates-root");
  }

  get pageHeader() {
    return this.page.getByTestId("templates-page-header");
  }

  get searchInput() {
    return this.page.getByTestId("templates-list-search-input");
  }

  get categoryFilter() {
    return this.page.getByTestId("templates-list-category-filter");
  }

  /** Filter-miss empty state (rows exist, but the search/category filter matches nothing). */
  get emptyState() {
    return this.page.getByTestId("templates-list-empty-state");
  }

  /** Zero-rows empty state — the templates table itself is empty (production DB state). */
  get emptyStateNoTemplates() {
    return this.page.getByTestId("templates-list-empty-state-no-templates");
  }

  get emptyStateNoTemplatesCta() {
    return this.page.getByTestId("templates-list-empty-state-no-templates-cta");
  }

  templateRow(id: string) {
    return this.page.getByTestId(`templates-list-row-${id}`);
  }

  useButton(id: string) {
    return this.page.getByTestId(`templates-row-use-${id}`);
  }

  get allRows() {
    return this.page.locator('[data-testid^="templates-list-row-"]');
  }

  /**
   * A Radix Select option in the open category-filter dropdown. SelectItem
   * carries no testid, so role+name is the locator (precedence #2).
   */
  categoryFilterOption(name: string) {
    return this.page.getByRole("option", { name, exact: true });
  }
}
