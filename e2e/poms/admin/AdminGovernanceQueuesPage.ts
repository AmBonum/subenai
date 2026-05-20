import { BasePage } from "../BasePage";

/**
 * Composite POM for the three governance queue routes in /admin:
 *   - /admin/audit (AuditLogViewer)
 *   - /admin/dsr (DsrQueue)
 *   - /admin/reports (ReportsQueue)
 *
 * Each route is a thin lazy shell mounting the corresponding component.
 * This POM exposes route-level + component-level surfaces for the
 * Phase 7 session 4 smoke-baseline spec.
 */
export class AdminAuditPage extends BasePage {
  static readonly PATH = "/admin/audit" as const;

  open() {
    return this.goto(AdminAuditPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-audit-root");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("admin-audit-page-header-title");
  }

  get viewerRoot() {
    return this.page.getByTestId("audit-log-root");
  }

  get emptyState() {
    return this.page.getByTestId("audit-log-empty-state");
  }

  get table() {
    return this.page.getByTestId("audit-log-table");
  }

  rowByPrefix() {
    return this.page.locator("[data-testid^='audit-log-row-']");
  }

  rowById(id: string) {
    return this.page.getByTestId(`audit-log-row-${id}`);
  }

  get filterActor() {
    return this.page.getByTestId("audit-log-filter-actor");
  }

  get filterAction() {
    return this.page.getByTestId("audit-log-filter-action");
  }

  get filterPii() {
    return this.page.getByTestId("audit-log-filter-pii");
  }

  get filterDateFrom() {
    return this.page.getByTestId("audit-log-filter-date-from");
  }

  get filterDateTo() {
    return this.page.getByTestId("audit-log-filter-date-to");
  }

  get paginationPrev() {
    return this.page.getByTestId("audit-log-pagination-prev");
  }

  get paginationNext() {
    return this.page.getByTestId("audit-log-pagination-next");
  }

  /**
   * Open the action Select and pick `action` (matches the `<SelectItem>`
   * value verbatim — these are action codes, not Slovak labels, so the
   * arg is e.g. `dsr_request_resolved`).
   */
  async selectAction(action: string) {
    await this.filterAction.click();
    await this.page.getByRole("option", { name: action }).click();
  }

  /** Pick the "Len PII prístupy" option in the PII filter Select. */
  async selectPiiOnly() {
    await this.filterPii.click();
    await this.page.getByRole("option", { name: "Len PII prístupy" }).click();
  }
}

export class AdminDsrPage extends BasePage {
  static readonly PATH = "/admin/dsr" as const;

  open() {
    return this.goto(AdminDsrPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-dsr-root");
  }

  get pageHeaderDescription() {
    return this.page.getByTestId("admin-dsr-page-header-description");
  }

  get queueRoot() {
    return this.page.getByTestId("dsr-queue-root");
  }

  get table() {
    return this.page.getByTestId("dsr-queue-table");
  }

  rowByPrefix() {
    // Match only the row container, not the per-row sub-elements
    // (sla-badge, resolve-button, reject-button) that share the
    // `dsr-queue-row-` prefix.
    return this.page.locator(
      "[data-testid^='dsr-queue-row-']:not([data-testid*='-sla-badge']):not([data-testid*='-resolve-button']):not([data-testid*='-reject-button'])",
    );
  }

  rowById(id: string) {
    return this.page.getByTestId(`dsr-queue-row-${id}`);
  }
}

export class AdminReportsPage extends BasePage {
  static readonly PATH = "/admin/reports" as const;

  open() {
    return this.goto(AdminReportsPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-reports-root");
  }

  get queueRoot() {
    return this.page.getByTestId("reports-queue-root");
  }

  get emptyState() {
    return this.page.getByTestId("reports-queue-empty-state");
  }

  rowByPrefix() {
    return this.page.locator("[data-testid^='reports-queue-row-']");
  }
}
