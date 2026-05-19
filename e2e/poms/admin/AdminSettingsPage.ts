import { BasePage } from "../BasePage";

export class AdminSettingsPage extends BasePage {
  static readonly PATH = "/admin/settings" as const;

  async open() {
    return this.goto(AdminSettingsPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-settings-root");
  }

  get deferredNotice() {
    return this.page.getByTestId("admin-settings-deferred-notice");
  }

  get form() {
    return this.page.getByTestId("admin-settings-form");
  }

  featureFlagSwitch(key: "ai_generator" | "audit_exports" | "trap_popup") {
    return this.page.getByTestId(`admin-settings-feature-flag-${key}`);
  }

  get retentionInput() {
    return this.page.getByTestId("admin-settings-retention-default-input");
  }

  get primaryColorInput() {
    return this.page.getByTestId("admin-settings-branding-primary-color");
  }

  get submitButton() {
    return this.page.getByTestId("admin-settings-submit");
  }

  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  async submit() {
    await this.submitButton.click();
  }
}
