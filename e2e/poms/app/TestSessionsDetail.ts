// E49 Phase 1 — POM covering both surfaces of the test sessions detail
// feature:
//   1. The Results-tab list rendered inside the test editor
//      (`SessionsList` at /app/tests/$testId?tab=results).
//   2. The per-session side-sheet (`SessionDetailSheet` at
//      /app/tests/$testId/sessions/$sessionId).
//
// Locator getters mirror the `data-testid` contracts in
// `specs/app/test-sessions-detail.md`. The POM exposes a thin wrapper
// over Radix Select interactions because the actual `<select>` element
// is a non-native combobox; "open trigger + click option labelled X"
// is the only reliable way to drive it.

import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/** Status filter values mapped 1:1 to the visible Slovak option labels. */
export type SessionStatusOption = "all" | "in_progress" | "completed" | "abandoned";

/** Sort options mapped to the visible Slovak option labels. */
export type SessionSortOption = "started_at_desc" | "started_at_asc" | "score_desc" | "score_asc";

const STATUS_LABEL: Record<SessionStatusOption, string> = {
  all: "Všetky stavy",
  in_progress: "Prebiehajúce",
  completed: "Dokončené",
  abandoned: "Opustené",
};

const SORT_LABEL: Record<SessionSortOption, string> = {
  started_at_desc: "Najnovšie",
  started_at_asc: "Najstaršie",
  score_desc: "Najvyššie skóre",
  score_asc: "Najnižšie skóre",
};

export class TestSessionsDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ---------------------------------------------------------------- Navigation
  // Public navigation API. The signatures intentionally differ from
  // `BasePage.goto(path)` — these accept opaque test/session IDs and
  // own the URL composition so specs never hand-craft routes.
  async gotoTest(testId: string) {
    return super.goto(`/app/tests/${testId}?tab=results`);
  }

  async gotoSession(testId: string, sessionId: string) {
    return super.goto(`/app/tests/${testId}/sessions/${sessionId}`);
  }

  // ------------------------------------------------------------- Sessions list
  get root() {
    return this.page.getByTestId("test-sessions-list-root");
  }

  get statusFilter() {
    return this.page.getByTestId("test-sessions-list-status-filter");
  }

  get searchInput() {
    return this.page.getByTestId("test-sessions-list-search-input");
  }

  get sortSelect() {
    return this.page.getByTestId("test-sessions-list-sort-select");
  }

  get pageSizeSelect() {
    return this.page.getByTestId("test-sessions-list-page-size-select");
  }

  get paginationPrev() {
    return this.page.getByTestId("test-sessions-list-pagination-prev");
  }

  get paginationNext() {
    return this.page.getByTestId("test-sessions-list-pagination-next");
  }

  get paginationInfo() {
    return this.page.getByTestId("test-sessions-list-pagination-info");
  }

  get empty() {
    return this.page.getByTestId("test-sessions-list-empty");
  }

  get loading() {
    return this.page.getByTestId("test-sessions-list-loading");
  }

  row(sessionId: string) {
    return this.page.getByTestId(`test-sessions-list-row-${sessionId}`);
  }

  rowOpenLink(sessionId: string) {
    return this.page.getByTestId(`test-sessions-list-row-${sessionId}-open`);
  }

  /** All visible <tr> rows in the table, in DOM order (table rows only — excludes Open links). */
  get tableRows() {
    return this.page.locator("tr[data-testid^='test-sessions-list-row-']");
  }

  /** Every node tagged with a `test-sessions-list-row-*` testid (rows + open links). */
  get anySessionRowNode() {
    return this.page.locator("[data-testid^='test-sessions-list-row-']");
  }

  /** Every `session-detail-answer-row-*` node currently mounted (rows + value/expected/time/correctness children). */
  get anyAnswerRowNode() {
    return this.page.locator("[data-testid^='session-detail-answer-row-']");
  }

  // ---------------------------------------------------------------- KPI cards
  get kpiTotal() {
    return this.page.getByTestId("test-editor-kpi-total");
  }

  get kpiCompleted() {
    return this.page.getByTestId("test-editor-kpi-completed");
  }

  get kpiAvgScore() {
    return this.page.getByTestId("test-editor-kpi-avg-score");
  }

  // ---------------------------------------------------------------- Side-sheet
  get sheetRoot() {
    return this.page.getByTestId("session-detail-root");
  }

  get respondentIdentity() {
    return this.page.getByTestId("session-detail-respondent-identity");
  }

  get statusBadge() {
    return this.page.getByTestId("session-detail-status-badge");
  }

  get score() {
    return this.page.getByTestId("session-detail-score");
  }

  get startedAt() {
    return this.page.getByTestId("session-detail-started-at");
  }

  get finishedAt() {
    return this.page.getByTestId("session-detail-finished-at");
  }

  get duration() {
    return this.page.getByTestId("session-detail-duration");
  }

  get auditRef() {
    return this.page.getByTestId("session-detail-audit-ref");
  }

  answerRow(questionId: string) {
    return this.page.getByTestId(`session-detail-answer-row-${questionId}`);
  }

  answerRowCorrectness(questionId: string) {
    return this.page.getByTestId(`session-detail-answer-row-${questionId}-correctness`);
  }

  answerRowValue(questionId: string) {
    return this.page.getByTestId(`session-detail-answer-row-${questionId}-value`);
  }

  answerRowExpected(questionId: string) {
    return this.page.getByTestId(`session-detail-answer-row-${questionId}-expected`);
  }

  answerRowTime(questionId: string) {
    return this.page.getByTestId(`session-detail-answer-row-${questionId}-time`);
  }

  get emptyInProgress() {
    return this.page.getByTestId("session-detail-empty-in-progress");
  }

  get notFound() {
    return this.page.getByTestId("session-detail-not-found");
  }

  get close() {
    return this.page.getByTestId("session-detail-close");
  }

  // ------------------------------------------------------------------ Actions
  async filterByStatus(status: SessionStatusOption) {
    await this.statusFilter.click();
    await this.page.getByRole("option", { name: STATUS_LABEL[status] }).click();
  }

  async search(text: string) {
    await this.searchInput.fill(text);
  }

  async sortBy(option: SessionSortOption) {
    await this.sortSelect.click();
    await this.page.getByRole("option", { name: SORT_LABEL[option] }).click();
  }

  async setPageSize(n: number) {
    await this.pageSizeSelect.click();
    await this.page.getByRole("option", { name: String(n) }).click();
  }

  async goNext() {
    await this.paginationNext.click();
  }

  async goPrev() {
    await this.paginationPrev.click();
  }

  async openSession(sessionId: string) {
    await this.rowOpenLink(sessionId).click();
  }

  async closeSheet() {
    await this.close.click();
  }
}
