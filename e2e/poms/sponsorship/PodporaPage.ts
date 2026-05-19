import type { Locator, Page, Response } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * POM for the /support donation form (E10 sponsorship; AH-16 renamed /podpora).
 *
 * Locator strategy is `data-testid` first — see `.claude/CLAUDE.md` § Test IDs.
 * Specs must NOT call `page.locator(...)` / `page.getByTestId(...)` directly;
 * every element a spec touches has a getter or method here.
 */
export type DonateMode = "oneoff" | "monthly";

export interface DonateFormInput {
  mode: DonateMode;
  amountEur: number;
  email: string;
  name: string;
  showInList?: boolean;
  displayName?: string;
  displayLink?: string;
  displayMessage?: string;
}

export class PodporaPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(opts: { cancelled?: boolean } = {}): Promise<Response | null> {
    return this.goto(opts.cancelled ? "/support?cancelled=1" : "/support");
  }

  // ---------------------------------------------------------------------------
  // Structural
  // ---------------------------------------------------------------------------

  get heading(): Locator {
    return this.page.getByTestId("podpora-heading");
  }

  get backHomeLink(): Locator {
    return this.page.getByTestId("podpora-back-link");
  }

  get heroParagraph(): Locator {
    return this.page.getByTestId("podpora-hero");
  }

  get heroAboutLink(): Locator {
    return this.page.getByTestId("podpora-hero-about-link");
  }

  get form(): Locator {
    return this.page.getByTestId("podpora-form");
  }

  get cancelledBanner(): Locator {
    return this.page.getByTestId("podpora-cancelled-banner");
  }

  get errorBanner(): Locator {
    return this.page.getByTestId("podpora-error-banner");
  }

  get displayMessageCounter(): Locator {
    return this.page.getByTestId("podpora-display-message-counter");
  }

  // ---------------------------------------------------------------------------
  // Mode + amount
  // ---------------------------------------------------------------------------

  modeRadio(mode: DonateMode): Locator {
    return this.page.getByTestId(`podpora-mode-${mode}`);
  }

  get amountFieldsetLegend(): Locator {
    return this.page.getByTestId("podpora-amount-fieldset").locator("legend");
  }

  amountPreset(value: number): Locator {
    return this.page.getByTestId(`podpora-amount-${value}`);
  }

  get amountCustomButton(): Locator {
    return this.page.getByTestId("podpora-amount-custom");
  }

  get amountCustomInput(): Locator {
    return this.page.getByTestId("podpora-amount-custom-input");
  }

  // ---------------------------------------------------------------------------
  // Invoice fields
  // ---------------------------------------------------------------------------

  get emailInput(): Locator {
    return this.page.getByTestId("podpora-field-email");
  }

  get nameInput(): Locator {
    return this.page.getByTestId("podpora-field-name");
  }

  get taxIdInput(): Locator {
    return this.page.getByTestId("podpora-field-tax-id");
  }

  // ---------------------------------------------------------------------------
  // Public-recognition fields (visible only when "show in list" is checked)
  // ---------------------------------------------------------------------------

  get showInListCheckbox(): Locator {
    return this.page.getByTestId("podpora-checkbox-show-in-list");
  }

  get displayNameInput(): Locator {
    return this.page.getByTestId("podpora-field-display-name");
  }

  get displayLinkInput(): Locator {
    return this.page.getByTestId("podpora-field-display-link");
  }

  get displayMessageInput(): Locator {
    return this.page.getByTestId("podpora-field-display-message");
  }

  get showInFooterCheckbox(): Locator {
    return this.page.getByTestId("podpora-checkbox-show-in-footer");
  }

  // ---------------------------------------------------------------------------
  // Consents + submit
  // ---------------------------------------------------------------------------

  get consentImmediateCheckbox(): Locator {
    return this.page.getByTestId("podpora-checkbox-consent-immediate");
  }

  get consentDataCheckbox(): Locator {
    return this.page.getByTestId("podpora-checkbox-consent-data");
  }

  get submitButton(): Locator {
    return this.page.getByTestId("podpora-submit-button");
  }

  // ---------------------------------------------------------------------------
  // Composite actions
  // ---------------------------------------------------------------------------

  /**
   * Fills the form with valid input and clicks submit. Caller is responsible
   * for waiting on the resulting navigation (e.g. redirect to Stripe Checkout).
   */
  async fillAndSubmit(input: DonateFormInput): Promise<void> {
    await this.modeRadio(input.mode).click();
    await this.selectAmount(input.amountEur, input.mode);
    await this.emailInput.fill(input.email);
    await this.nameInput.fill(input.name);

    if (input.showInList) {
      await this.showInListCheckbox.check();
      if (input.displayName !== undefined) {
        await this.displayNameInput.fill(input.displayName);
      }
      if (input.displayLink !== undefined) {
        await this.displayLinkInput.fill(input.displayLink);
      }
      if (input.displayMessage !== undefined) {
        await this.displayMessageInput.fill(input.displayMessage);
      }
    }

    await this.consentImmediateCheckbox.check();
    await this.consentDataCheckbox.check();
    await this.submitButton.click();
  }

  /**
   * Picks a preset when the amount is one of the standard tiers; otherwise
   * opens the "custom amount" input (oneoff only).
   */
  async selectAmount(amountEur: number, mode: DonateMode): Promise<void> {
    const presets =
      mode === "oneoff" ? [5, 10, 25, 50, 100] : ([5, 10, 25] as const).map((n) => n as number);
    if (presets.includes(amountEur)) {
      await this.amountPreset(amountEur).click();
      return;
    }
    if (mode === "monthly") {
      throw new Error(`Monthly mode requires preset 5/10/25, got ${amountEur}`);
    }
    await this.amountCustomButton.click();
    await this.amountCustomInput.fill(String(amountEur));
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }

  async canonicalHref(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    );
  }

  async robotsContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
  }

  async ogTitleContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null,
    );
  }

  async metaDescriptionContent(): Promise<string | null> {
    return this.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('meta[name="description"]'));
      return all.at(-1)?.getAttribute("content") ?? null;
    });
  }
}
