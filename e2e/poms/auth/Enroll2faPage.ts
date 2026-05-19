import { BasePage } from "../BasePage";
import type { Page } from "@playwright/test";

export class Enroll2faPage extends BasePage {
  static readonly PATH = "/login/enroll-2fa" as const;

  constructor(page: Page) {
    super(page);
  }

  async open() {
    return this.goto(Enroll2faPage.PATH);
  }

  // ---- structural / header ----

  get card() {
    return this.page.getByTestId("enroll-2fa-card");
  }

  get heading() {
    return this.page.getByTestId("enroll-2fa-heading");
  }

  get subheading() {
    return this.page.getByTestId("enroll-2fa-subheading");
  }

  get stepIndicator() {
    return this.page.getByTestId("enroll-2fa-step-indicator");
  }

  get errorMessage() {
    return this.page.getByTestId("enroll-2fa-error");
  }

  // ---- step 1 ----

  get step1Panel() {
    return this.page.getByTestId("enroll-2fa-step-1");
  }

  get step1ContinueButton() {
    return this.page.getByTestId("enroll-2fa-step-1-continue");
  }

  async clickStep1Continue() {
    await this.step1ContinueButton.click();
  }

  // ---- step 2 ----

  get step2Panel() {
    return this.page.getByTestId("enroll-2fa-step-2");
  }

  get qrImage() {
    return this.page.getByTestId("enroll-2fa-qr-image");
  }

  get qrLoading() {
    return this.page.getByTestId("enroll-2fa-qr-loading");
  }

  get manualSecret() {
    return this.page.getByTestId("enroll-2fa-manual-secret");
  }

  get step2ContinueButton() {
    return this.page.getByTestId("enroll-2fa-step-2-continue");
  }

  async clickStep2Continue() {
    await this.step2ContinueButton.click();
  }

  // ---- step 3 ----

  get step3Form() {
    return this.page.getByTestId("enroll-2fa-step-3");
  }

  /**
   * The hidden <input> rendered by input-otp. The `data-testid` prop is
   * spread onto the underlying <input> element (not the container div),
   * so .fill() works directly against this locator.
   */
  get codeInput() {
    return this.page.getByTestId("enroll-2fa-code-input");
  }

  get verifyButton() {
    return this.page.getByTestId("enroll-2fa-verify-button");
  }

  async fillCode(value: string) {
    await this.codeInput.fill(value);
  }

  async clickVerify() {
    await this.verifyButton.click();
  }

  // ---- step 4 ----

  get step4Panel() {
    return this.page.getByTestId("enroll-2fa-step-4");
  }

  get backupCodesList() {
    return this.page.getByTestId("enroll-2fa-backup-codes-list");
  }

  get backupCodeItems() {
    return this.page.getByTestId("enroll-2fa-backup-codes-list").locator("li");
  }

  get backupCopyButton() {
    return this.page.getByTestId("enroll-2fa-backup-copy-button");
  }

  get backupDownloadButton() {
    return this.page.getByTestId("enroll-2fa-backup-download-button");
  }

  get step4ContinueButton() {
    return this.page.getByTestId("enroll-2fa-step-4-continue");
  }

  async clickBackupCopy() {
    await this.backupCopyButton.click();
  }

  async clickBackupDownload() {
    await this.backupDownloadButton.click();
  }

  async clickStep4Continue() {
    await this.step4ContinueButton.click();
  }

  // ---- head meta ----

  /**
   * Returns the content of <meta name="robots"> or null if absent.
   * Evaluated via JS because TanStack Start injects head tags only in the
   * SSR/wrangler runtime; a locator-based approach would time out under Vite.
   */
  async robotsMetaContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector("meta[name='robots']")?.getAttribute("content") ?? null,
    );
  }
}
