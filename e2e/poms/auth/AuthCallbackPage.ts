import { BasePage } from "../BasePage";

export class AuthCallbackPage extends BasePage {
  static readonly PATH = "/auth/callback" as const;

  /**
   * Navigate to /auth/callback optionally with search params.
   *
   * Examples:
   *   await callback.open();
   *   await callback.open("?code=abc");
   *   await callback.open("?error=access_denied&error_description=x");
   *   await callback.open("?code=abc&redirect=/admin/users");
   */
  async open(searchString?: string) {
    return this.goto(`${AuthCallbackPage.PATH}${searchString ?? ""}`);
  }

  // ---- structural elements ----

  get root() {
    return this.page.getByTestId("auth-callback-root");
  }

  get loading() {
    return this.page.getByTestId("auth-callback-loading");
  }

  get error() {
    return this.page.getByTestId("auth-callback-error");
  }

  // ---- head meta ----

  /**
   * Returns the content attribute of <meta name="robots"> or null if absent.
   * Evaluated via JS because TanStack Start injects head tags only in the
   * SSR/wrangler context; a locator-based approach would time out in the
   * Vite dev environment.
   */
  async robotsMetaContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector("meta[name='robots']")?.getAttribute("content") ?? null,
    );
  }
}
