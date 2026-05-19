import { BasePage } from "../BasePage";

/**
 * /admin/* shell — sidebar locale slot and structural locators.
 *
 * Used by locale-lock spec (TC-07) to assert the locale slot is empty
 * while LOCALE_SWITCHER_ENABLED = false.
 */
export class AdminShellPage extends BasePage {
  static readonly PATH = "/admin" as const;

  async open() {
    return this.goto(AdminShellPage.PATH);
  }

  get sidebar() {
    return this.page.getByTestId("admin-shell-sidebar");
  }

  /** Wrapper div for the sidebar LocaleSwitcher slot (always in DOM when sidebar is expanded; empty while flag is off). */
  get sidebarLocaleSlot() {
    return this.page.getByTestId("admin-shell-sidebar-locale");
  }

  /** The locale-switcher trigger — only present when LOCALE_SWITCHER_ENABLED = true. */
  get localeSwitcherTrigger() {
    return this.page.getByTestId("locale-switcher-trigger");
  }
}
