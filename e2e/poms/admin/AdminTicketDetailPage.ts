import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

/**
 * Admin ticket detail page (`/admin/tickets/$id`). Sticky header with
 * status + category badges, status-machine action buttons, scrollable
 * thread, attachments section, and reply composer. POSTs to
 * `/api/support-ticket-reply` on send.
 */
export class AdminTicketDetailPage extends BasePage {
  static readonly PATH_PREFIX = "/admin/tickets" as const;

  get root(): Locator {
    return this.page.getByTestId("admin-ticket-detail-root");
  }

  get loadingIndicator(): Locator {
    return this.page.getByTestId("admin-ticket-detail-loading");
  }

  get notFoundCard(): Locator {
    return this.page.getByTestId("admin-ticket-detail-not-found");
  }

  get backLink(): Locator {
    return this.page.getByTestId("admin-ticket-detail-back");
  }

  get subject(): Locator {
    return this.page.getByTestId("admin-ticket-detail-subject");
  }

  get statusBadge(): Locator {
    return this.page.getByTestId("admin-ticket-detail-status-badge");
  }

  get actions(): Locator {
    return this.page.getByTestId("admin-ticket-detail-actions");
  }

  // FSM action buttons --------------------------------------------------
  get startButton(): Locator {
    return this.page.getByTestId("admin-ticket-action-start");
  }

  get resolveButton(): Locator {
    return this.page.getByTestId("admin-ticket-action-resolve");
  }

  get reopenButton(): Locator {
    return this.page.getByTestId("admin-ticket-action-reopen");
  }

  get archiveButton(): Locator {
    return this.page.getByTestId("admin-ticket-action-archive");
  }

  // Thread + composer ---------------------------------------------------
  get thread(): Locator {
    return this.page.getByTestId("admin-ticket-detail-thread");
  }

  get attachments(): Locator {
    return this.page.getByTestId("admin-ticket-detail-attachments");
  }

  get composer(): Locator {
    return this.page.getByTestId("admin-ticket-detail-composer");
  }

  get replyTextarea(): Locator {
    return this.page.getByTestId("admin-ticket-detail-reply-textarea");
  }

  get replySendButton(): Locator {
    return this.page.getByTestId("admin-ticket-detail-reply-send");
  }

  message(messageId: string): Locator {
    return this.page.getByTestId(`admin-ticket-detail-message-${messageId}`);
  }

  // Actions -------------------------------------------------------------
  async open(ticketId: string): Promise<void> {
    await this.goto(`${AdminTicketDetailPage.PATH_PREFIX}/${encodeURIComponent(ticketId)}`);
    await this.root.waitFor({ state: "visible" });
  }

  async sendReply(body: string): Promise<void> {
    await this.replyTextarea.fill(body);
    await this.replySendButton.click();
  }
}
