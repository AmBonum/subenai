import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class TestEditorPage extends BasePage {
  async open(testId: string) {
    return this.goto(`/app/tests/${testId}`);
  }

  get root() {
    return this.page.getByTestId("test-editor-root");
  }

  get notFound() {
    return this.page.getByTestId("test-editor-not-found");
  }

  get tabResults() {
    return this.page.getByTestId("test-editor-tabs-results");
  }

  get tabAnalytics() {
    return this.page.getByTestId("test-editor-tabs-analytics");
  }

  get tabSettings() {
    return this.page.getByTestId("test-editor-tabs-settings");
  }

  get shareButton() {
    return this.page.getByTestId("test-editor-share-button");
  }

  get titleInput() {
    return this.page.getByTestId("test-editor-title-input");
  }

  get saveButton() {
    return this.page.getByTestId("test-editor-save-button");
  }

  get archiveButton() {
    return this.page.getByTestId("test-editor-archive-button");
  }

  get publishButton() {
    return this.page.getByTestId("test-editor-publish-button");
  }

  // E50 status-machine exits.
  get unpublishButton() {
    return this.page.getByTestId("test-editor-unpublish-button");
  }

  get unarchiveButton() {
    return this.page.getByTestId("test-editor-unarchive-button");
  }

  // Shared app-shell ConfirmDialog (archive / unpublish confirmations).
  get confirmDialog() {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogConfirm() {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  get confirmDialogCancel() {
    return this.page.getByTestId("app-shell-confirm-dialog-cancel");
  }

  // E50 — Settings tab: audience chip + intake-fields card.
  get audienceChip() {
    return this.page.getByTestId("test-editor-audience-chip");
  }

  get intakeRoot() {
    return this.page.getByTestId("test-editor-intake-root");
  }

  get intakeNameToggle() {
    return this.page.getByTestId("test-editor-intake-name-toggle");
  }

  get intakeNameRequired() {
    return this.page.getByTestId("test-editor-intake-name-required");
  }

  get intakeEmailToggle() {
    return this.page.getByTestId("test-editor-intake-email-toggle");
  }

  get intakeEmailRequired() {
    return this.page.getByTestId("test-editor-intake-email-required");
  }

  // E50 — Results tab zero-sessions empty state CTAs.
  get sessionsEmpty() {
    return this.page.getByTestId("test-sessions-list-empty");
  }

  get sessionsEmptyCopyLinkButton() {
    return this.page.getByTestId("test-sessions-list-empty-copy-link-button");
  }

  get sessionsEmptyPublishButton() {
    return this.page.getByTestId("test-sessions-list-empty-publish-button");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("app-shell-page-header-title");
  }

  get statusBadge() {
    return this.page.getByTestId("admin-status-badge");
  }

  get resultsPanel() {
    return this.page.getByTestId("test-editor-results-panel");
  }

  get analyticsPanel() {
    return this.page.getByTestId("test-editor-analytics-panel");
  }

  get settingsPanel() {
    return this.page.getByTestId("test-editor-settings-panel");
  }

  get descriptionInput() {
    return this.page.getByTestId("test-editor-description-input");
  }

  // E45 Phase 1 — Questions tab + Order Mode toggle in Settings.
  get tabQuestions() {
    return this.page.getByTestId("test-editor-tabs-questions");
  }

  get questionsPanel() {
    return this.page.getByTestId("test-editor-questions-panel");
  }

  get questionsRoot() {
    return this.page.getByTestId("test-editor-questions-root");
  }

  get questionsCount() {
    return this.page.getByTestId("test-editor-questions-count");
  }

  get questionsAddButton() {
    return this.page.getByTestId("test-editor-questions-add-button");
  }

  get questionsEmptyState() {
    return this.page.getByTestId("test-editor-questions-empty-state");
  }

  get orderModeRoot() {
    return this.page.getByTestId("test-editor-order-mode-root");
  }

  get orderModeFixed() {
    return this.page.getByTestId("test-editor-order-mode-option-fixed");
  }

  get orderModeRandom() {
    return this.page.getByTestId("test-editor-order-mode-option-random");
  }

  get orderModeRadioFixed() {
    return this.page.getByTestId("test-editor-order-mode-radio-fixed");
  }

  get orderModeRadioRandom() {
    return this.page.getByTestId("test-editor-order-mode-radio-random");
  }

  // E45 Phase 2 — Password card in Settings.
  get passwordCardRoot() {
    return this.page.getByTestId("test-editor-password-root");
  }

  get passwordStatus() {
    return this.page.getByTestId("test-editor-password-status");
  }

  get passwordInput() {
    return this.page.getByTestId("test-editor-password-input");
  }

  get passwordConfirm() {
    return this.page.getByTestId("test-editor-password-confirm");
  }

  get passwordSubmit() {
    return this.page.getByTestId("test-editor-password-submit-button");
  }

  get passwordClear() {
    return this.page.getByTestId("test-editor-password-clear-button");
  }

  // E45 Phase 3 — Invite button (currently "Pripravujeme" gated; see also
  // src/lib/feature-gates.ts).
  get inviteButton() {
    return this.page.getByTestId("test-editor-invite-button");
  }

  get inviteTooltipTrigger() {
    return this.page.getByTestId("test-editor-invite-tooltip-trigger");
  }

  get inviteGateTooltip() {
    return this.page.getByTestId("test-editor-invite-gate-tooltip");
  }

  get inviteComingSoonBadge() {
    return this.page.getByTestId("coming-soon-badge");
  }

  shareDialog(): ShareDialogPom {
    return new ShareDialogPom(this.page);
  }
}

export class ShareDialogPom {
  constructor(private readonly page: Page) {}

  get root() {
    return this.page.getByTestId("share-dialog-root");
  }

  get urlInput() {
    return this.page.getByTestId("share-dialog-url-input");
  }

  get copyButton() {
    return this.page.getByTestId("share-dialog-copy-link-button");
  }

  get closeButton() {
    return this.page.getByTestId("share-dialog-close-button");
  }
}
