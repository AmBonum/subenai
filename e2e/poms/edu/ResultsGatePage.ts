import { BasePage } from "../BasePage";

/** POM for the /test/zostava/$id/vysledky password gate and dashboard. */
export class ResultsGatePage extends BasePage {
  async open(setId: string) {
    return this.goto(`/test/zostava/${setId}/vysledky`);
  }

  // ── Gate elements ─────────────────────────────────────────────────────────────

  get authGate() {
    return this.page.getByTestId("vysledky-auth-gate");
  }

  get gateHeading() {
    return this.page.getByTestId("vysledky-gate-heading");
  }

  get passwordInput() {
    return this.page.getByTestId("vysledky-gate-password-input");
  }

  get submitButton() {
    return this.page.getByTestId("vysledky-gate-submit-button");
  }

  get errorMessage() {
    return this.page.getByTestId("vysledky-gate-error-message");
  }

  // ── Dashboard elements ────────────────────────────────────────────────────────

  get dashboard() {
    return this.page.getByTestId("vysledky-dashboard");
  }

  get dashboardHeading() {
    return this.page.getByTestId("vysledky-dashboard-heading");
  }

  get metaLine() {
    return this.page.getByTestId("vysledky-meta-line");
  }

  get downloadCsvButton() {
    return this.page.getByTestId("vysledky-download-csv-button");
  }

  get logoutButton() {
    return this.page.getByTestId("vysledky-logout-button");
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────────

  get aggStatsRoot() {
    return this.page.getByTestId("agg-stats-root");
  }

  get aggStatsCount() {
    return this.page.getByTestId("agg-stats-count");
  }

  get aggStatsAvg() {
    return this.page.getByTestId("agg-stats-avg");
  }

  get aggStatsMedian() {
    return this.page.getByTestId("agg-stats-median");
  }

  get aggStatsMinMax() {
    return this.page.getByTestId("agg-stats-min-max");
  }

  get aggStatsPassValue() {
    return this.page.getByTestId("agg-stats-pass-value");
  }

  aggStatsBand(index: 0 | 1 | 2 | 3) {
    return this.page.getByTestId(`agg-stats-band-${index}`);
  }

  // ── Respondents table ─────────────────────────────────────────────────────────

  get tableRoot() {
    return this.page.getByTestId("resp-table-root");
  }

  get tableSearch() {
    return this.page.getByTestId("resp-table-search");
  }

  get table() {
    return this.page.getByTestId("resp-table-table");
  }

  get tableEmpty() {
    return this.page.getByTestId("resp-table-empty");
  }

  tableRow(attemptId: string) {
    return this.page.getByTestId(`resp-table-row-${attemptId}`);
  }

  tableDeleteButton(attemptId: string) {
    return this.page.getByTestId(`resp-table-delete-btn-${attemptId}`);
  }

  // ── Table sort headers ────────────────────────────────────────────────────────

  /** The <th> element for a sortable column identified by its visible label text. */
  tableColumnHeader(labelText: string) {
    return this.table.locator("th[scope='col']").filter({ hasText: labelText });
  }

  /** The sort button inside a column header. */
  tableColumnSortButton(labelText: string) {
    return this.tableColumnHeader(labelText).locator("button");
  }

  /** First row in the table body. */
  get tableFirstRow() {
    return this.table.locator("tbody tr").first();
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  async submitPassword(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async clickLogout() {
    await this.logoutButton.click();
  }

  async clickDownloadCsv() {
    return this.downloadCsvButton.click();
  }
}
