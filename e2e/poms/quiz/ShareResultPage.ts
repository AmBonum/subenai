import { BasePage } from "../BasePage";

export class ShareResultPage extends BasePage {
  static path(shareId: string): string {
    return `/r/${shareId}`;
  }

  async open(shareId: string) {
    return this.goto(ShareResultPage.path(shareId));
  }

  // Loading / not-found states

  get loadingIndicator() {
    return this.page.getByTestId("share-result-loading");
  }

  get notFoundContainer() {
    return this.page.getByTestId("share-result-not-found");
  }

  get notFoundCta() {
    return this.page.getByTestId("share-result-not-found-cta");
  }

  // Main page root (only present when a row was found)

  get pageRoot() {
    return this.page.getByTestId("share-result-page");
  }

  // Score area

  get scoreValue() {
    return this.page.getByTestId("share-result-score");
  }

  get percentileValue() {
    return this.page.getByTestId("share-result-percentile");
  }

  // Cards

  get personalityCard() {
    return this.page.getByTestId("share-result-personality-card");
  }

  get breakdownCard() {
    return this.page.getByTestId("share-result-breakdown-card");
  }

  // Answer review

  get reviewToggle() {
    return this.page.getByTestId("share-result-review-toggle");
  }

  get reviewRegion() {
    return this.page.getByTestId("share-result-review-region");
  }

  async openReview(): Promise<void> {
    await this.reviewToggle.click();
  }

  // CTA

  get ctaTestLink() {
    return this.page.getByTestId("share-result-cta-test");
  }

  // Delete flow

  get deleteButton() {
    return this.page.getByTestId("share-result-delete-button");
  }

  get deleteConfirmButton() {
    return this.page.getByTestId("share-result-delete-confirm-button");
  }

  get deleteCancelButton() {
    return this.page.getByTestId("share-result-delete-cancel-button");
  }

  get deleteDoneMessage() {
    return this.page.getByTestId("share-result-delete-done");
  }

  async initiateDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  async confirmDelete(): Promise<void> {
    await this.deleteConfirmButton.click();
  }
}
