import { BasePage } from "../BasePage";

export class AppHistoryPage extends BasePage {
  static readonly PATH = "/app/history" as const;

  async open() {
    return this.goto(AppHistoryPage.PATH);
  }

  get root() {
    return this.page.getByTestId("history-root");
  }

  get emptyState() {
    return this.page.getByTestId("history-empty-state");
  }

  get testFilter() {
    return this.page.getByTestId("history-test-filter");
  }

  get dateFromInput() {
    return this.page.getByTestId("history-date-from");
  }

  get dateToInput() {
    return this.page.getByTestId("history-date-to");
  }

  get eventTypeFilter() {
    return this.page.getByTestId("history-event-type-filter");
  }

  get clearFiltersButton() {
    return this.page.getByTestId("history-clear-filters-button");
  }

  get pageHeaderEyebrow() {
    return this.page.getByTestId("app-shell-page-header-eyebrow");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("app-shell-page-header-title");
  }

  row(id: string) {
    return this.page.getByTestId(`history-row-${id}`);
  }

  rowTitle(id: string) {
    return this.page.getByTestId(`history-row-${id}-title`);
  }

  rowAction(id: string) {
    return this.page.getByTestId(`history-row-${id}-action`);
  }

  rowTypeBadge(id: string) {
    return this.page.getByTestId(`history-row-${id}-type-badge`);
  }

  async selectEventType(value: string) {
    await this.eventTypeFilter.click();
    await this.page.getByRole("option", { name: value }).click();
  }

  async setDateFrom(isoDate: string) {
    await this.dateFromInput.fill(isoDate);
  }

  async clearFilters() {
    await this.clearFiltersButton.click();
  }
}
