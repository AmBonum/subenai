import { BasePage } from "../BasePage";

/**
 * Page Object Model for /thank-you/$sessionId (ThankYouView).
 *
 * All locators are via data-testid. Wait helpers use locator.waitFor
 * with explicit timeouts — no assertions here.
 */
export class PodakovaniePage extends BasePage {
  static readonly PATH_PREFIX = "/thank-you" as const;

  async open(sessionId: string): Promise<void> {
    await this.goto(`${PodakovaniePage.PATH_PREFIX}/${sessionId}`);
  }

  // ---------------------------------------------------------------------------
  // State containers
  // ---------------------------------------------------------------------------

  get statePending() {
    return this.page.getByTestId("podakovanie-state-pending");
  }

  get stateReady() {
    return this.page.getByTestId("podakovanie-state-ready");
  }

  get stateUnpaid() {
    return this.page.getByTestId("podakovanie-state-unpaid");
  }

  get stateTimeout() {
    return this.page.getByTestId("podakovanie-state-timeout");
  }

  get stateNotFound() {
    return this.page.getByTestId("podakovanie-state-not-found");
  }

  get stateError() {
    return this.page.getByTestId("podakovanie-state-error");
  }

  // ---------------------------------------------------------------------------
  // PendingState body
  // ---------------------------------------------------------------------------

  get pendingHeading() {
    return this.page.getByTestId("podakovanie-pending-heading");
  }

  // ---------------------------------------------------------------------------
  // ReadyState body
  // ---------------------------------------------------------------------------

  get readyHeading() {
    return this.page.getByTestId("podakovanie-ready-heading");
  }

  get readyKindLabel() {
    return this.page.getByTestId("podakovanie-ready-kind-label");
  }

  get readyAmount() {
    return this.page.getByTestId("podakovanie-ready-amount");
  }

  get readyDate() {
    return this.page.getByTestId("podakovanie-ready-date");
  }

  get readyInvoiceLink() {
    return this.page.getByTestId("podakovanie-ready-invoice-link");
  }

  get readyInvoicePending() {
    return this.page.getByTestId("podakovanie-ready-invoice-pending");
  }

  // ---------------------------------------------------------------------------
  // Subscription block
  // ---------------------------------------------------------------------------

  get subscriptionBlock() {
    return this.page.getByTestId("podakovanie-subscription-block");
  }

  get subscriptionHeading() {
    return this.page.getByTestId("podakovanie-subscription-heading");
  }

  get manageSubscriptionButton() {
    return this.page.getByTestId("podakovanie-manage-subscription-button");
  }

  get portalError() {
    return this.page.getByTestId("podakovanie-portal-error");
  }

  // ---------------------------------------------------------------------------
  // Other state headings
  // ---------------------------------------------------------------------------

  get unpaidHeading() {
    return this.page.getByTestId("podakovanie-unpaid-heading");
  }

  get timeoutHeading() {
    return this.page.getByTestId("podakovanie-timeout-heading");
  }

  get notFoundHeading() {
    return this.page.getByTestId("podakovanie-not-found-heading");
  }

  get errorHeading() {
    return this.page.getByTestId("podakovanie-error-heading");
  }

  // ---------------------------------------------------------------------------
  // Wait helpers (no assertions — caller decides what to assert)
  // ---------------------------------------------------------------------------

  async waitForReady(opts?: { timeout?: number }): Promise<void> {
    await this.stateReady.waitFor({ state: "visible", timeout: opts?.timeout ?? 45_000 });
  }

  /**
   * Waits for the page's TimeoutState UI (POLL_MAX_MS elapsed without a
   * webhook confirmation) — a condition-based wait on `stateTimeout`,
   * NOT a hard sleep. Renamed from `waitForTimeout` to avoid reading
   * like Playwright's banned `page.waitForTimeout` hard wait.
   */
  async waitForTimeoutState(opts?: { timeout?: number }): Promise<void> {
    await this.stateTimeout.waitFor({ state: "visible", timeout: opts?.timeout ?? 35_000 });
  }

  async waitForNotFound(opts?: { timeout?: number }): Promise<void> {
    await this.stateNotFound.waitFor({ state: "visible", timeout: opts?.timeout ?? 10_000 });
  }

  // ---------------------------------------------------------------------------
  // Text helpers
  // ---------------------------------------------------------------------------

  async readyAmountText(): Promise<string> {
    return (await this.readyAmount.innerText()).trim();
  }

  async readyHeadingText(): Promise<string> {
    return (await this.readyHeading.innerText()).trim();
  }
}
