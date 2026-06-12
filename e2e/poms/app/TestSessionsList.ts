// E49 Phase 1c-3 — POM for the `/app/tests` index page. Mirrors the
// data-testid contracts in `src/routes/app.tests.index.tsx`. Specs use
// these getters exclusively; raw `page.getByTestId(...)` calls in a spec
// are a CLAUDE.md violation.

import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export type TestsIndexStatus = "all" | "published" | "draft" | "archived";

export class TestSessionsListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    return super.goto("/app/tests");
  }

  get root() {
    return this.page.getByTestId("tests-list-root");
  }

  get newTestButton() {
    return this.page.getByTestId("tests-list-new-test-button");
  }

  get searchInput() {
    return this.page.getByTestId("tests-list-search-input");
  }

  get statusFilter() {
    return this.page.getByTestId("tests-list-status-filter");
  }

  get branchFilter() {
    return this.page.getByTestId("tests-list-branch-filter");
  }

  get clearFiltersButton() {
    return this.page.getByTestId("tests-list-clear-filters-button");
  }

  get emptyState() {
    return this.page.getByTestId("tests-list-empty-state");
  }

  /** True-empty card — the educator owns zero tests (first-run state). */
  get emptyInitial() {
    return this.page.getByTestId("tests-list-empty-initial");
  }

  statusTab(status: TestsIndexStatus) {
    return this.page.getByTestId(`tests-list-status-tab-${status}`);
  }

  /** Every test card currently rendered. */
  get rows() {
    return this.page.locator(
      "[data-testid^='tests-list-row-']:not([data-testid*='-title-']):not([data-testid*='-open-']):not([data-testid*='-share-'])",
    );
  }

  row(testId: string) {
    return this.page.getByTestId(`tests-list-row-${testId}`);
  }

  rowTitle(testId: string) {
    return this.page.getByTestId(`tests-list-row-title-${testId}`);
  }

  rowOpen(testId: string) {
    return this.page.getByTestId(`tests-list-row-open-${testId}`);
  }

  async search(text: string) {
    await this.searchInput.fill(text);
  }

  async pickStatus(status: TestsIndexStatus) {
    await this.statusTab(status).click();
  }

  async clearFilters() {
    await this.clearFiltersButton.click();
  }
}
