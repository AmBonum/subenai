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

  get twoFaToggle() {
    return this.page.getByTestId("app-account-security-2fa-toggle");
  }

  get twoFaTooltip() {
    return this.page.getByTestId("app-account-security-2fa-tooltip");
  }

  get sessionsList() {
    return this.page.getByTestId("app-account-security-sessions-list");
  }

  revoke(sessionId: string) {
    return this.page.getByTestId(`app-account-security-revoke-${sessionId}`);
  }
}
