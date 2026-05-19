import { BasePage } from "../BasePage";

/**
 * Minimal surface for the /admin AAL2 gate security spec.
 *
 * The gate redirects away from /admin before the shell renders, so most
 * assertions in the spec are URL-level (`expect(page).toHaveURL(...)`).
 * The two element getters here correspond to the only DOM nodes the tests
 * need to confirm are visible (2FA card) or absent (admin shell).
 */
export class AdminAal2GatePage extends BasePage {
  static readonly PATH = "/admin" as const;

  async open() {
    return this.goto(AdminAal2GatePage.PATH);
  }

  /** Root wrapper of the admin shell layout — rendered only when all gates pass. */
  get adminShellRoot() {
    return this.page.getByTestId("admin-shell-root");
  }

  /** The step-up 2FA card rendered by /login/verify-2fa. */
  get verifyTwoFaCard() {
    return this.page.getByTestId("verify-2fa-card");
  }
}
