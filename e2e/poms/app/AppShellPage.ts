import { BasePage } from "../BasePage";

/**
 * /app/* shell — sidebar, header, page-header, confirm dialog.
 *
 * POM-only locators per CLAUDE.md. Specs MUST import these getters
 * rather than reach for `page.getByTestId(...)` directly. Auth-gated:
 * the page only renders when a Supabase session exists. Until AH-11
 * provides an authenticated-session test fixture, specs that need to
 * reach the shell remain `test.skip`.
 */
export class AppShellPage extends BasePage {
  static readonly PATH = "/app" as const;

  async open() {
    return this.goto(AppShellPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-shell-root");
  }

  get header() {
    return this.page.getByTestId("app-shell-header");
  }

  get headerHome() {
    return this.page.getByTestId("app-shell-header-home");
  }

  get headerUser() {
    return this.page.getByTestId("app-shell-header-user");
  }

  get headerUserName() {
    return this.page.getByTestId("app-shell-header-user-name");
  }

  get headerLogout() {
    return this.page.getByTestId("app-shell-header-logout");
  }

  get sidebar() {
    return this.page.getByTestId("app-shell-sidebar");
  }

  get sidebarNav() {
    return this.page.getByTestId("app-shell-sidebar-nav");
  }

  get sidebarLinkDashboard() {
    return this.page.getByTestId("app-shell-sidebar-link-dashboard");
  }

  get sidebarLinkTests() {
    return this.page.getByTestId("app-shell-sidebar-link-tests");
  }

  get sidebarLinkTeams() {
    return this.page.getByTestId("app-shell-sidebar-link-teams");
  }

  get sidebarLinkNotifications() {
    return this.page.getByTestId("app-shell-sidebar-link-notifications");
  }

  get sidebarLinkHelp() {
    return this.page.getByTestId("app-shell-sidebar-link-help");
  }

  get sidebarLinkAccountProfile() {
    return this.page.getByTestId("app-shell-sidebar-link-account-profile");
  }

  get sidebarLinkAccountSecurity() {
    return this.page.getByTestId("app-shell-sidebar-link-account-security");
  }

  get sidebarLinkAdmin() {
    return this.page.getByTestId("app-shell-sidebar-link-admin");
  }

  get sidebarNotificationsBadge() {
    return this.page.getByTestId("app-shell-sidebar-notifications-badge");
  }

  get main() {
    return this.page.getByTestId("app-shell-main");
  }

  get pageHeader() {
    return this.page.getByTestId("app-shell-page-header");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("app-shell-page-header-title");
  }

  get pageHeaderEyebrow() {
    return this.page.getByTestId("app-shell-page-header-eyebrow");
  }

  get pageHeaderSubtitle() {
    return this.page.getByTestId("app-shell-page-header-subtitle");
  }

  get confirmDialogRoot() {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmDialogConfirm() {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  get confirmDialogCancel() {
    return this.page.getByTestId("app-shell-confirm-dialog-cancel");
  }
}
