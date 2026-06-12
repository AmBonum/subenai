import { BasePage } from "../BasePage";

/**
 * /admin/settings — read-only GDPR / compliance dashboard (E40 close-out).
 * Values come from build-time env vars + the DPA retention migration;
 * the page renders badges, the sub-processor register, and runbook links.
 */
export class AdminSettingsPage extends BasePage {
  static readonly PATH = "/admin/settings" as const;

  async open() {
    return this.goto(AdminSettingsPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-settings-root");
  }

  get readonlyNotice() {
    return this.page.getByTestId("admin-settings-readonly-notice");
  }

  get dpaSection() {
    return this.page.getByTestId("admin-settings-dpa-section");
  }

  dpaRow(key: "flow" | "watermark" | "version" | "retention") {
    return this.page.getByTestId(`admin-settings-dpa-${key}`);
  }

  get subprocessorsSection() {
    return this.page.getByTestId("admin-settings-subprocessors-section");
  }

  get subprocessorsList() {
    return this.page.getByTestId("admin-settings-subprocessors-list");
  }

  subprocessor(slug: string) {
    return this.page.getByTestId(`admin-settings-subprocessor-${slug}`);
  }

  get notificationsSection() {
    return this.page.getByTestId("admin-settings-notifications-section");
  }

  get notificationsLink() {
    return this.page.getByTestId("admin-settings-notifications-link");
  }

  get runbookSection() {
    return this.page.getByTestId("admin-settings-runbook-section");
  }

  get runbookLink() {
    return this.page.getByTestId("admin-settings-runbook-link");
  }
}
