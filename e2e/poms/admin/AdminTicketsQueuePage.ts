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

  // Per-row helpers -----------------------------------------------------
  row(ticketId: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-${ticketId}`);
  }

  rowLink(ticketId: string): Locator {
    return this.page.getByTestId(`admin-tickets-row-link-${ticketId}`);
  }

  statusFilter(status: string): Locator {
    return this.page.getByTestId(`admin-tickets-filter-status-${status}`);
  }

  async open(): Promise<void> {
    await this.goto(AdminTicketsQueuePage.PATH);
    await this.root.waitFor({ state: "visible" });
  }
}
