import { BasePage } from "../BasePage";

export class AppAccountProfilePage extends BasePage {
  static readonly PATH = "/app/account/profile" as const;

  async open() {
    return this.goto(AppAccountProfilePage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-account-profile-root");
  }

  get header() {
    return this.page.getByTestId("app-account-profile-page-header");
  }

  get form() {
    return this.page.getByTestId("app-account-profile-form");
  }

  get nameInput() {
    return this.page.getByTestId("app-account-profile-name-input");
  }

  get emailInput() {
    return this.page.getByTestId("app-account-profile-email-input");
  }

  get avatarInput() {
    return this.page.getByTestId("app-account-profile-avatar-url-input");
  }

  get localeSelect() {
    return this.page.getByTestId("app-account-profile-locale-select");
  }

  get submit() {
    return this.page.getByTestId("app-account-profile-submit");
  }

  get successToast() {
    return this.page.getByTestId("app-account-profile-toast-success");
  }

  get reset() {
    return this.page.getByTestId("app-account-profile-reset");
  }

  get badgeDirty() {
    return this.page.getByTestId("app-account-profile-badge-dirty");
  }

  get badgeSaved() {
    return this.page.getByTestId("app-account-profile-badge-saved");
  }

  get gotoSecurity() {
    return this.page.getByTestId("app-account-profile-goto-security");
  }

  get nameError() {
    return this.page.getByTestId("app-account-profile-name-error");
  }

  get emailError() {
    return this.page.getByTestId("app-account-profile-email-error");
  }

  get initialsError() {
    return this.page.getByTestId("app-account-profile-initials-error");
  }
}
