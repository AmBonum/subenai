import { BasePage } from "../BasePage";
import type { Page } from "@playwright/test";

export class Verify2faPage extends BasePage {
  static readonly PATH = "/login/verify-2fa" as const;

  constructor(page: Page) {
    super(page);
  }

  async open(search?: string) {
    return this.goto(search ? `${Verify2faPage.PATH}?${search}` : Verify2faPage.PATH);
  }

  // ---- structural / header ----

  get card() {
    return this.page.getByTestId("verify-2fa-card");
  }

  get heading() {
    return this.page.getByTestId("verify-2fa-heading");
  }

  get subheading() {
    return this.page.getByTestId("verify-2fa-subheading");
  }

  // ---- TOTP form ----

  get totpForm() {
    return this.page.getByTestId("verify-2fa-totp-form");
  }

  /**
   * The hidden <input> rendered by input-otp. The `data-testid` is spread
   * onto the underlying <input> element, so .fill() works directly.
   */
  get codeInput() {
    return this.page.getByTestId("verify-2fa-code-input");
  }

  get hint() {
    return this.page.getByTestId("verify-2fa-hint");
  }

  get errorMessage() {
    return this.page.getByTestId("verify-2fa-error");
  }

  get submitButton() {
    return this.page.getByTestId("verify-2fa-submit-button");
  }

  get useBackupLink() {
    return this.page.getByTestId("verify-2fa-use-backup-link");
  }

  async fillCode(value: string) {
    await this.codeInput.fill(value);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickUseBackup() {
    await this.useBackupLink.click();
  }

  // ---- Backup-code form ----

  get backupForm() {
    return this.page.getByTestId("verify-2fa-backup-form");
  }

  get backupInput() {
    return this.page.getByTestId("verify-2fa-backup-input");
  }

  get backupErrorMessage() {
    return this.page.getByTestId("verify-2fa-backup-error");
  }

  get backupSubmitButton() {
    return this.page.getByTestId("verify-2fa-backup-submit-button");
  }

  get useTotpLink() {
    return this.page.getByTestId("verify-2fa-use-totp-link");
  }

  async fillBackupCode(value: string) {
    await this.backupInput.fill(value);
  }

  async clickBackupSubmit() {
    await this.backupSubmitButton.click();
  }

  async clickUseTotp() {
    await this.useTotpLink.click();
  }

  // ---- head meta ----

  /**
   * Returns the content of <meta name="robots"> or null if absent.
   * TanStack Start injects head tags only in the SSR/wrangler runtime.
   */
  async robotsMetaContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector("meta[name='robots']")?.getAttribute("content") ?? null,
    );
  }
}
