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

  get categoryBadge(): Locator {
    return this.page.getByTestId("admin-ticket-detail-category-badge");
  }

  get submitterBlock(): Locator {
    return this.page.getByTestId("admin-ticket-detail-submitter");
  }

  get metadataCreatedAt(): Locator {
    return this.page.getByTestId("admin-ticket-metadata-created-at");
  }

  get actions(): Locator {
    return this.page.getByTestId("admin-ticket-detail-actions");
  }

  // Generic FSM action mapper — accepts the *target* status the button
  // transitions to (e.g. "in_progress", "resolved", "archived",
  // "reopened"). Mirrors the four named getters below.
  statusActionButton(target: "in_progress" | "resolved" | "reopened" | "archived"): Locator {
    const map = {
      in_progress: "start",
      resolved: "resolve",
      reopened: "reopen",
      archived: "archive",
    } as const;
    return this.page.getByTestId(`admin-ticket-action-${map[target]}`);
  }

  /**
   * The confirm modal opened by destructive/terminal status actions —
   * located by role on purpose: the a11y spec verifies the dialog carries
   * proper `dialog` / `alertdialog` semantics, not just a testid.
   */
  get confirmDialogByRole(): Locator {
    return this.page.getByRole("dialog").or(this.page.getByRole("alertdialog")).first();
  }

  // Kebab (overflow) menu ----------------------------------------------
  get kebabTrigger(): Locator {
    return this.page.getByTestId("admin-ticket-detail-kebab-trigger");
  }

  get kebabMenu(): Locator {
    return this.page.getByTestId("admin-ticket-detail-kebab-menu");
  }

  get kebabSpamOption(): Locator {
    return this.page.getByTestId("admin-ticket-detail-kebab-spam");
  }

  get kebabCopyLinkOption(): Locator {
    return this.page.getByTestId("admin-ticket-detail-kebab-copy-link");
  }

  get kebabOpenAnonOption(): Locator {
    return this.page.getByTestId("admin-ticket-detail-kebab-open-anon");
  }

  // Confirm dialog (shared shadcn AlertDialog) -------------------------
  get confirmDialogRoot(): Locator {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogConfirmButton(): Locator {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  get confirmDialogCancelButton(): Locator {
    return this.page.getByTestId("app-shell-confirm-dialog-cancel");
  }

  get confirmDialogTypedInput(): Locator {
    return this.page.getByTestId("app-shell-confirm-dialog-typed-input");
  }

  confirmDialogIcon(severity: "info" | "warning" | "destructive" | "success"): Locator {
    return this.page.getByTestId(`app-shell-confirm-dialog-icon-${severity}`);
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

  /** E48-v4 — internal-note toggle inside the composer. */
  get replyInternalToggle(): Locator {
    return this.page.getByTestId("admin-ticket-detail-reply-internal-toggle");
  }

  message(messageId: string): Locator {
    return this.page.getByTestId(`admin-ticket-detail-message-${messageId}`);
  }

  /** E48-v4 — badge rendered on internal-note message bubbles. */
  messageInternalBadge(messageId: string): Locator {
    return this.page.getByTestId(`admin-ticket-detail-message-internal-badge-${messageId}`);
  }

  // Attachment viewer ---------------------------------------------------
  get attachmentViewerRoot(): Locator {
    return this.page.getByTestId("admin-ticket-detail-attachment-viewer");
  }

  attachmentItem(attachmentId: string): Locator {
    return this.page.getByTestId(`admin-ticket-attachment-item-${attachmentId}`);
  }

  attachmentImage(attachmentId: string): Locator {
    return this.page.getByTestId(`admin-ticket-attachment-image-${attachmentId}`);
  }

  attachmentPdfEmbed(attachmentId: string): Locator {
    return this.page.getByTestId(`admin-ticket-attachment-pdf-${attachmentId}`);
  }

  attachmentFilename(attachmentId: string): Locator {
    return this.page.getByTestId(`admin-ticket-attachment-filename-${attachmentId}`);
  }

  attachmentDownloadButton(attachmentId: string): Locator {
    return this.page.getByTestId(`admin-ticket-attachment-download-${attachmentId}`);
  }

  get attachmentLightboxRoot(): Locator {
    return this.page.getByTestId("admin-ticket-attachment-lightbox");
  }

  get attachmentLightboxCloseButton(): Locator {
    return this.page.getByTestId("admin-ticket-attachment-lightbox-close");
  }

  // Assignees -----------------------------------------------------------
  get assigneesRoot(): Locator {
    return this.page.getByTestId("admin-ticket-detail-assignees");
  }

  assigneeChip(userId: string): Locator {
    return this.page.getByTestId(`admin-ticket-assignee-chip-${userId}`);
  }

  assigneeRemoveButton(userId: string): Locator {
    return this.page.getByTestId(`admin-ticket-assignee-remove-${userId}`);
  }

  get addAssigneeButton(): Locator {
    return this.page.getByTestId("admin-ticket-assignee-add-button");
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
