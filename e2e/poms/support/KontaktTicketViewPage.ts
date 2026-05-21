import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

/**
 * Anonymous read-only ticket thread view (`/kontakt/ticket/$id?token=...`).
 * Renders the thread the submitter sees from the confirmation/reply email
 * link. The token is the plaintext (64-hex) that the
 * `get_ticket_thread_for_view_token` RPC hashes server-side to look up
 * the row — RLS denies any direct table read for anon.
 */
export class KontaktTicketViewPage extends BasePage {
  static readonly PATH_PREFIX = "/kontakt/ticket" as const;

  get root(): Locator {
    return this.page.getByTestId("kontakt-ticket-view-root");
  }

  get subject(): Locator {
    return this.page.getByTestId("kontakt-ticket-view-subject");
  }

  get status(): Locator {
    return this.page.getByTestId("kontakt-ticket-view-status");
  }

  get thread(): Locator {
    return this.page.getByTestId("kontakt-ticket-view-thread");
  }

  get attachments(): Locator {
    return this.page.getByTestId("kontakt-ticket-view-attachments");
  }

  get notFoundCard(): Locator {
    return this.page.getByTestId("kontakt-ticket-view-not-found");
  }

  get backLink(): Locator {
    return this.page.getByTestId("kontakt-ticket-view-back");
  }

  // Actions -------------------------------------------------------------
  async openWithToken(ticketId: string, token: string): Promise<void> {
    await this.goto(
      `${KontaktTicketViewPage.PATH_PREFIX}/${encodeURIComponent(ticketId)}?token=${encodeURIComponent(token)}`,
    );
    await this.root.waitFor({ state: "visible" });
  }

  async openWithoutToken(ticketId: string): Promise<void> {
    await this.goto(`${KontaktTicketViewPage.PATH_PREFIX}/${encodeURIComponent(ticketId)}`);
    await this.root.waitFor({ state: "visible" });
  }

  messageLocator(messageId: string): Locator {
    return this.page.getByTestId(`kontakt-ticket-view-message-${messageId}`);
  }
}
