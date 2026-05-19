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

  get emptyState() {
    return this.page.getByTestId("templates-list-empty-state");
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
}
