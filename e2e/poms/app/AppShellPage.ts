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

  /** Wrapper div for the header LocaleSwitcher slot (always in DOM; empty while flag is off). */
  get headerLocaleSlot() {
    return this.page.getByTestId("app-shell-header-locale");
  }

  /** The locale-switcher trigger — only present when LOCALE_SWITCHER_ENABLED = true. */
  get localeSwitcherTrigger() {
    return this.page.getByTestId("locale-switcher-trigger");
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

  // Mobile drawer (E36 A1). Hamburger trigger + Sheet content live on
  // viewports <lg; the desktop `sidebar` aside is `display:none` but
  // stays in DOM. Mobile nav links are namespaced
  // `app-shell-mobile-link-*` to keep desktop assertions unambiguous.

  get mobileTrigger() {
    return this.page.getByTestId("app-shell-mobile-trigger");
  }

  get mobileDrawer() {
    return this.page.getByTestId("app-shell-mobile-drawer");
  }

  get mobileClose() {
    return this.page.getByTestId("app-shell-mobile-close");
  }

  get mobileNav() {
    return this.page.getByTestId("app-shell-mobile-nav");
  }

  get mobileLinkDashboard() {
    return this.page.getByTestId("app-shell-mobile-link-dashboard");
  }

  get mobileLinkTests() {
    return this.page.getByTestId("app-shell-mobile-link-tests");
  }

  get mobileLinkTeams() {
    return this.page.getByTestId("app-shell-mobile-link-teams");
  }

  get mobileLinkNotifications() {
    return this.page.getByTestId("app-shell-mobile-link-notifications");
  }

  get mobileLinkAccountProfile() {
    return this.page.getByTestId("app-shell-mobile-link-account-profile");
  }

  get mobileLogout() {
    return this.page.getByTestId("app-shell-mobile-logout");
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

  /**
   * Sonner "signed out" confirmation toast fired by <SignedOutFlash /> on
   * the public root after logout. Sonner renders in a portal with no
   * testid hook — verbatim Slovak text is the user-facing contract.
   */
  get signedOutToast() {
    // Verbatim from marketing.json `user_menu.signed_out_toast` (tykanie sweep).
    return this.page.getByText("Bol/a si odhlásený/á.");
  }
}
