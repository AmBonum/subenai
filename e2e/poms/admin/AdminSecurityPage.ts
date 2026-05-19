import { BasePage } from "../BasePage";

export class AdminSecurityPage extends BasePage {
  static readonly PATH = "/admin/security" as const;

  async open() {
    return this.goto(AdminSecurityPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-security-root");
  }

  get factorCard() {
    return this.page.getByTestId("admin-security-factor-card");
  }

  get factorFriendlyName() {
    return this.page.getByTestId("admin-security-factor-friendly-name");
  }

  get factorStatus() {
    return this.page.getByTestId("admin-security-factor-status");
  }

  get factorNone() {
    return this.page.getByTestId("admin-security-factor-none");
  }

  get factorNoneCta() {
    return this.page.getByTestId("admin-security-factor-none-cta");
  }

  get factorResetButton() {
    return this.page.getByTestId("admin-security-factor-reset-button");
  }

  get backupCard() {
    return this.page.getByTestId("admin-security-backup-card");
  }

  get backupCount() {
    return this.page.getByTestId("admin-security-backup-count");
  }

  get backupWarning() {
    return this.page.getByTestId("admin-security-backup-warning");
  }

  get backupRegenButton() {
    return this.page.getByTestId("admin-security-backup-regen-button");
  }

  get newCodesPanel() {
    return this.page.getByTestId("admin-security-new-codes-panel");
  }

  get newCodesCopyButton() {
    return this.page.getByTestId("admin-security-new-codes-copy");
  }

  get newCodesDownloadButton() {
    return this.page.getByTestId("admin-security-new-codes-download");
  }

  get newCodesDismissButton() {
    return this.page.getByTestId("admin-security-new-codes-dismiss");
  }

  get infoCard() {
    return this.page.getByTestId("admin-security-info-card");
  }

  newCodeItem(code: string) {
    return this.page.getByTestId(`admin-security-new-code-${code}`);
  }

  get confirmDialog() {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogTitle() {
    return this.page.getByTestId("app-shell-confirm-dialog-title");
  }

  get confirmDialogConfirm() {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }
}
