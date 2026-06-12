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

  // ---- Password change (real supabase.auth.updateUser flow) ---------------
  get passwordForm() {
    return this.page.getByTestId("app-account-security-password-form");
  }

  get newPassword() {
    return this.page.getByTestId("app-account-security-new-password");
  }

  get confirmPassword() {
    return this.page.getByTestId("app-account-security-confirm-password");
  }

  get submitPassword() {
    return this.page.getByTestId("app-account-security-submit-password");
  }

  get passwordError() {
    return this.page.getByTestId("app-account-security-password-error");
  }

  get reauthForgotLink() {
    return this.page.getByTestId("app-account-security-reauth-forgot-link");
  }

  get forgotLink() {
    return this.page.getByTestId("app-account-security-forgot-link");
  }

  /** Replaces the password form for accounts without an email identity. */
  get oauthOnlyNotice() {
    return this.page.getByTestId("app-account-security-oauth-only");
  }

  /**
   * Removed fabricated "active sessions" card — kept as a locator so the
   * spec can assert it stays gone.
   */
  get legacySessionsList() {
    return this.page.getByTestId("app-account-security-sessions-list");
  }

  // ---- 2FA card ------------------------------------------------------------
  get twoFaActivateButton() {
    return this.page.getByTestId("app-account-security-2fa-activate-button");
  }

  get twoFaActiveBadge() {
    return this.page.getByTestId("app-account-security-2fa-active-badge");
  }

  get twoFaDeactivateButton() {
    return this.page.getByTestId("app-account-security-2fa-deactivate-button");
  }

  /** First Sonner toast notification rendered by the global Toaster. */
  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }
}
