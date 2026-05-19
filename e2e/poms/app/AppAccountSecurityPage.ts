import { BasePage } from "../BasePage";

export class AppAccountSecurityPage extends BasePage {
  static readonly PATH = "/app/account/security" as const;

  async open() {
    return this.goto(AppAccountSecurityPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-account-security-root");
  }

  get header() {
    return this.page.getByTestId("app-account-security-page-header");
  }

  get passwordForm() {
    return this.page.getByTestId("app-account-security-password-form");
  }

  get currentPassword() {
    return this.page.getByTestId("app-account-security-current-password");
  }

  get newPassword() {
    return this.page.getByTestId("app-account-security-new-password");
  }

  get submitPassword() {
    return this.page.getByTestId("app-account-security-submit-password");
  }

  get twoFaActivateButton() {
    return this.page.getByTestId("app-account-security-2fa-activate-button");
  }

  get twoFaActiveBadge() {
    return this.page.getByTestId("app-account-security-2fa-active-badge");
  }

  get twoFaDeactivateButton() {
    return this.page.getByTestId("app-account-security-2fa-deactivate-button");
  }

  get sessionsList() {
    return this.page.getByTestId("app-account-security-sessions-list");
  }

  revoke(sessionId: string) {
    return this.page.getByTestId(`app-account-security-revoke-${sessionId}`);
  }

  /** First Sonner toast notification rendered by the global Toaster. */
  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }
}
