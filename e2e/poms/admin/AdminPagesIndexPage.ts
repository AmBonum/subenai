import { BasePage } from "../BasePage";

export class AdminPagesIndexPage extends BasePage {
  static readonly PATH = "/admin/pages" as const;

  async open() {
    return this.goto(AdminPagesIndexPage.PATH);
  }

  get root() {
    return this.page.getByTestId("cms-pages-list-root");
  }

  get newButton() {
    return this.page.getByTestId("cms-pages-list-new-button");
  }

  get searchInput() {
    return this.page.getByTestId("cms-pages-list-search-input");
  }

  get statusFilter() {
    return this.page.getByTestId("cms-pages-list-status-filter");
  }

  get emptyState() {
    return this.page.getByTestId("cms-pages-list-empty");
  }

  listRow(id: string) {
    return this.page.getByTestId(`cms-pages-list-row-${id}`);
  }

  rowEditLink(id: string) {
    return this.page.getByTestId(`cms-pages-list-edit-${id}`);
  }

  rowDeleteButton(id: string) {
    return this.page.getByTestId(`cms-pages-list-delete-${id}`);
  }
}
