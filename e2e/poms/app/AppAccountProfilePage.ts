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
}
