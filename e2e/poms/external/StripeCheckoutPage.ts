import type { Page, Locator } from "@playwright/test";

/**
 * POM for the third-party Stripe Checkout hosted page (checkout.stripe.com).
 *
 * Not a BasePage subclass — Stripe is third-party DOM on a different origin
 * and renders its own shell (no `<header role="banner">`).
 *
 * Locator strategy:
 *   - Stripe exposes its OWN `data-testid` attributes on stable interactive
 *     elements (e.g. `card-accordion-item-button`). Prefer them — Stripe
 *     keeps them stable across layout A/B tests.
 *   - For form fields, prefer `getByLabel` with the localised Slovak label
 *     (Stripe is forced into `locale: "sk"` from create-checkout-session).
 *     Fall back to the English label for resilience if Stripe ever fails
 *     locale negotiation.
 *   - Card fields render top-level (no iframe) in the current Checkout
 *     layout — verified via live DOM inspection 2026-05-16.
 *
 * When Stripe shifts layout, only this file changes.
 */
export class StripeCheckoutPage {
  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------
  // Domain guard
  // ---------------------------------------------------------------------------

  async waitForOnStripeDomain(opts?: { timeout?: number }): Promise<void> {
    await this.page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, {
      timeout: opts?.timeout ?? 15_000,
    });
  }

  // ---------------------------------------------------------------------------
  // Payment-method accordion
  // ---------------------------------------------------------------------------

  /**
   * Stripe's own stable data-testid for the "Zaplatiť kartou" accordion.
   * NOTE: This button has a 0x0 visual rect — Stripe enlarges its click
   * area via CSS pseudo-elements. Playwright's actionability check
   * refuses to click it, so callers must use `force: true` or
   * `dispatchEvent("click")`.
   */
  private get cardAccordionButton(): Locator {
    return this.page.getByTestId("card-accordion-item-button");
  }

  // ---------------------------------------------------------------------------
  // Card fields (top-level in current Stripe Checkout layout)
  //
  // Stripe's input IDs (#cardNumber, #cardExpiry, #cardCvc, #billingName)
  // are stable across layouts and locales — labels and placeholders are
  // not (e.g. "Card number" vs "Číslo karty" vs "Numéro de carte").
  // ---------------------------------------------------------------------------

  get cardNumberInput(): Locator {
    return this.page.locator("#cardNumber");
  }

  get cardExpiryInput(): Locator {
    return this.page.locator("#cardExpiry");
  }

  get cardCvcInput(): Locator {
    return this.page.locator("#cardCvc");
  }

  get cardHolderInput(): Locator {
    return this.page.locator("#billingName");
  }

  private get zipInput(): Locator {
    return this.page.locator("#billingPostalCode");
  }

  // ---------------------------------------------------------------------------
  // Page load — wait for Stripe shell, expand card accordion, wait for fields
  // ---------------------------------------------------------------------------

  async waitForLoaded(opts?: { timeout?: number }): Promise<void> {
    const timeout = opts?.timeout ?? 30_000;
    // Wait for either:
    //   (a) card fields already visible — subscription mode, only payment
    //       method is card, accordion is pre-expanded; OR
    //   (b) the accordion button is attached — one-off mode with multiple
    //       payment methods, we need to expand the card item ourselves.
    // Whichever resolves first decides the path.
    const cardReady = this.cardNumberInput
      .waitFor({ state: "visible", timeout })
      .then(() => "card" as const);
    const accordionReady = this.cardAccordionButton
      .waitFor({ state: "attached", timeout })
      .then(() => "accordion" as const);
    const winner = await Promise.race([cardReady, accordionReady]);
    if (winner === "card") return;

    // Accordion path: trigger via JS — Playwright refuses to click the
    // 0x0 visible-but-overlayed button even though Stripe extends its
    // hit area via CSS.
    await this.cardAccordionButton.evaluate((el: HTMLElement) => el.click());
    await this.cardNumberInput.waitFor({ state: "visible", timeout: 15_000 });
  }

  // ---------------------------------------------------------------------------
  // Card entry
  // ---------------------------------------------------------------------------

  async fillTestCard(card: string, exp: string, cvc: string, zip?: string): Promise<void> {
    await this.cardNumberInput.fill(card);
    await this.cardExpiryInput.fill(exp);
    await this.cardCvcInput.fill(cvc);

    // Cardholder field is required by current Stripe Checkout for most
    // regions. Use a deterministic default — specs that care about the
    // billing name set it on the donate form (Customer.name), not on the
    // card token.
    if (await this.cardHolderInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await this.cardHolderInput.fill("Test Cardholder");
    }

    if (zip !== undefined) {
      if (await this.zipInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await this.zipInput.fill(zip);
      }
      // ZIP is best-effort: EU layout often omits it.
    }
  }

  // ---------------------------------------------------------------------------
  // Pay button
  // ---------------------------------------------------------------------------

  async pay(): Promise<void> {
    // Stripe's stable testid for the submit button at the bottom of the form.
    // Its visible text is "Zaplatiť" but the DOM contains a hidden
    // "Prebieha spracovanie" span — name-matching is unreliable.
    const payButton = this.page.getByTestId("hosted-payment-submit-button");
    await payButton.waitFor({ state: "visible", timeout: 15_000 });
    await payButton.click();
  }

  // ---------------------------------------------------------------------------
  // SCA / 3DS
  // ---------------------------------------------------------------------------

  /**
   * Locate the "Complete" button inside the 3DS challenge.
   *
   * Stripe Checkout's modern 3DS challenge renders as a top-level iframe
   * whose src includes `three-ds-2-challenge`. The iframe contains a
   * dialog with a nested iframe that holds the test-mode UI with the
   * "Complete" / "Fail" buttons.
   */
  private get sca3dsCompleteButton(): Locator {
    return this.page
      .frameLocator('iframe[src*="three-ds-2-challenge"]')
      .frameLocator("iframe")
      .getByRole("button", { name: /^Complete$/ });
  }

  async expectSCAChallenge(opts?: { timeout?: number }): Promise<void> {
    await this.sca3dsCompleteButton.waitFor({
      state: "visible",
      timeout: opts?.timeout ?? 30_000,
    });
  }

  async completeSCAChallenge(): Promise<void> {
    await this.sca3dsCompleteButton.click();
  }

  // ---------------------------------------------------------------------------
  // Cancel / back
  // ---------------------------------------------------------------------------

  async cancelAndReturn(): Promise<void> {
    // Stripe's back link carries the merchant name in its aria-label, e.g.
    // "Späť k obchodníkovi subenai sandbox".
    const backLink = this.page
      .getByRole("link", { name: /(Späť k obchodníkovi|back|cancel)/i })
      .first();
    await backLink.click();
    await this.page.waitForURL(/\/support\?cancelled=1/, { timeout: 15_000 });
  }

  // ---------------------------------------------------------------------------
  // Locale + custom-text helpers
  // ---------------------------------------------------------------------------

  async hasSlovakLocaleHint(): Promise<boolean> {
    const slovakStrings = [
      "Zaplatiť",
      "Spôsob platby",
      "Súhlasím so začatím",
      "Kontaktné informácie",
      "Číslo karty",
    ];
    const bodyText = await this.page.locator("body").innerText();
    return slovakStrings.some((s) => bodyText.includes(s));
  }

  async submitMessageText(): Promise<string> {
    // Stripe renders custom_text.submit.message above the pay button.
    // Match by text content rather than class — classes churn between layouts.
    const el = this.page.getByText(/Stlačením potvrdzujete súhlas/i).first();
    if (!(await el.isVisible({ timeout: 3_000 }).catch(() => false))) return "";
    return (await el.innerText()).trim();
  }
}
