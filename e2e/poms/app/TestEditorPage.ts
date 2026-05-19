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
