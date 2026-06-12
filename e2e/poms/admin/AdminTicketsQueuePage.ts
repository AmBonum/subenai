import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

/**
 * Admin queue at `/admin/tickets`. Filter chips for status + categories,
 * search box, and a table of tickets. Gated by AAL2 admin role — specs
 * must seed an ADMIN_SESSION before navigating.
 */
export class AdminTicketsQueuePage extends BasePage {
  static readonly PATH = "/admin/tickets" as const;

  get root(): Locator {
    return this.page.getByTestId("admin-tickets-queue");
  }

  get filters(): Locator {
    return this.page.getByTestId("admin-tickets-filters");
  }

  get searchInput(): Locator {
    return this.page.getByTestId("admin-tickets-search-input");
  }

  get archivedToggle(): Locator {
    return this.page.getByTestId("admin-tickets-filter-archived-toggle");
  }

  get loadingIndicator(): Locator {
    return this.page.getByTestId("admin-tickets-loading");
  }

  get errorState(): Locator {
    return this.page.getByTestId("admin-tickets-error");
  }

  get emptyState(): Locator {
    return this.page.getByTestId("admin-tickets-empty-state");
  }

  get table(): Locator {
    return this.page.getByTestId("admin-tickets-table");
  }

  get count(): Locator {
    return this.page.getByTestId("admin-tickets-count");
  }

  get clearFiltersButton(): Locator {
    return this.page.getByTestId("admin-tickets-empty-clear-filters");
  }

  get csvExportButton(): Locator {
    return this.page.getByTestId("admin-tickets-export-csv");
  }

  csvExportOption(scope: "filter" | "selected" | "all"): Locator {
    return this.page.getByTestId(`admin-tickets-export-option-${scope}`);
  }

  // Cross-component convenience getter — lives on the admin shell but
  // every queue test asserts on it, so we expose it here to keep specs
  // POM-only.
  get sidebarSupportBadge(): Locator {
    return this.page.getByTestId("admin-shell-sidebar-support-badge");
  }

  // Per-row helpers -----------------------------------------------------
  row(ticketId: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-${ticketId}`);
  }

  rowLink(ticketId: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-open-link-${ticketId}`);
  }

  statusFilter(status: string): Locator {
    return this.page.getByTestId(`admin-tickets-filter-status-${status}`);
  }

  get assignedColumnHeader(): Locator {
    // The "Pridelení" header is a SortableHeader like every other column.
    return this.page.getByTestId("admin-tickets-sort-assigned");
  }

  rowAssignedAvatars(ticketId: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-assigned-${ticketId}`);
  }

  rowAssignedOverflowChip(ticketId: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-assigned-overflow-${ticketId}`);
  }

  rowStatusTrigger(ticketId: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-status-trigger-${ticketId}`);
  }

  rowStatusOption(ticketId: string, status: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-status-option-${ticketId}-${status}`);
  }

  columnSortButton(column: string): Locator {
    return this.page.getByTestId(`admin-tickets-sort-${column}`);
  }

  columnSortIndicator(column: string): Locator {
    return this.page.getByTestId(`admin-tickets-sort-indicator-${column}`);
  }

  // ConfirmDialog (portal-rendered shadcn AlertDialog) ------------------
  get confirmDialog(): Locator {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogConfirm(): Locator {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  async open(): Promise<void> {
    await this.goto(AdminTicketsQueuePage.PATH);
    await this.root.waitFor({ state: "visible" });
  }
}
