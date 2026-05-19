import { BasePage } from "../BasePage";

export class AdminRespondentsPage extends BasePage {
  static readonly PATH = "/admin/respondents" as const;

  async open() {
    return this.goto(AdminRespondentsPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-respondents-root");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("admin-respondents-page-header-title");
  }

  get pageHeaderDescription() {
    return this.page.getByTestId("admin-respondents-page-header-description");
  }

  get listRoot() {
    return this.page.getByTestId("respondents-list-root");
  }

  get emptyState() {
    return this.page.getByTestId("respondents-list-empty-state");
  }

  get table() {
    return this.page.getByTestId("respondents-list-table");
  }

  get searchInput() {
    return this.page.getByTestId("respondents-list-search-input");
  }

  get filterTest() {
    return this.page.getByTestId("respondents-list-filter-test");
  }

  get filterStatus() {
    return this.page.getByTestId("respondents-list-filter-status");
  }

  row(id: string) {
    return this.page.getByTestId(`respondents-list-row-${id}`);
  }

  viewButton(id: string) {
    return this.page.getByTestId(`respondents-list-row-view-button-${id}`);
  }

  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }
}
