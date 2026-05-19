import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class SchoolsPage extends BasePage {
  static readonly PATH = "/schools" as const;

  // ---------------------------------------------------------------------------
  // Header / hero
  // ---------------------------------------------------------------------------

  get backLink(): Locator {
    return this.page.getByTestId("schools-back-link");
  }

  get heading(): Locator {
    return this.page.getByTestId("schools-heading");
  }

  get heroParagraph(): Locator {
    return this.page.getByTestId("schools-hero-paragraph");
  }

  // ---------------------------------------------------------------------------
  // Section headings
  // ---------------------------------------------------------------------------

  get whatHeading(): Locator {
    return this.page.getByTestId("schools-what-heading");
  }

  get step1Heading(): Locator {
    return this.page.getByTestId("schools-step1-heading");
  }

  get step2Heading(): Locator {
    return this.page.getByTestId("schools-step2-heading");
  }

  get step3Heading(): Locator {
    return this.page.getByTestId("schools-step3-heading");
  }

  get step4Heading(): Locator {
    return this.page.getByTestId("schools-step4-heading");
  }

  get gdprHeading(): Locator {
    return this.page.getByTestId("schools-gdpr-heading");
  }

  get faqHeading(): Locator {
    return this.page.getByTestId("schools-faq-heading");
  }

  // ---------------------------------------------------------------------------
  // In-body links
  // ---------------------------------------------------------------------------

  get composerLinkWhat(): Locator {
    return this.page.getByTestId("schools-composer-link-what");
  }

  get composerLinkStep1(): Locator {
    return this.page.getByTestId("schools-composer-link-step1");
  }

  // ---------------------------------------------------------------------------
  // Email template details / summary / pre
  // ---------------------------------------------------------------------------

  get emailTemplateDetails(): Locator {
    return this.page.getByTestId("schools-email-template-details");
  }

  get emailTemplateSummary(): Locator {
    return this.page.getByTestId("schools-email-template-summary");
  }

  get emailTemplatePre(): Locator {
    return this.page.getByTestId("schools-email-template-pre");
  }

  // ---------------------------------------------------------------------------
  // GDPR section links
  // ---------------------------------------------------------------------------

  get gdprDpaEmailLink(): Locator {
    return this.page.getByTestId("schools-gdpr-dpa-email-link");
  }

  get gdprPrivacyLink(): Locator {
    return this.page.getByTestId("schools-gdpr-privacy-link");
  }

  // ---------------------------------------------------------------------------
  // Outro card
  // ---------------------------------------------------------------------------

  get outroCard(): Locator {
    return this.page.getByTestId("schools-outro-card");
  }

  get outroComposerLink(): Locator {
    return this.page.getByTestId("schools-outro-composer-link");
  }

  get outroEmailLink(): Locator {
    return this.page.getByTestId("schools-outro-email-link");
  }

  // ---------------------------------------------------------------------------
  // FAQ section locators
  // ---------------------------------------------------------------------------

  get faqDts(): Locator {
    return this.page.locator("[data-testid='schools-faq-heading'] ~ dl dt");
  }

  get faqDivs(): Locator {
    return this.page.locator("[data-testid='schools-faq-heading'] ~ dl > div");
  }

  faqDivAt(index: number): Locator {
    return this.faqDivs.nth(index);
  }

  faqDdAt(index: number): Locator {
    return this.faqDivs.nth(index).locator("dd");
  }

  // ---------------------------------------------------------------------------
  // Step-4 section locators
  // ---------------------------------------------------------------------------

  get step4ListItems(): Locator {
    return this.page.locator("[data-testid='schools-step4-heading'] ~ ul li");
  }

  get step4ListItem5(): Locator {
    return this.page.locator("[data-testid='schools-step4-heading'] ~ ul li:nth-child(5)");
  }

  get step4ListItem5Strong(): Locator {
    return this.step4ListItem5.locator("strong");
  }

  get step4SessionNotice(): Locator {
    return this.page.locator("[data-testid='schools-step4-heading'] ~ p").last();
  }

  // ---------------------------------------------------------------------------
  // GDPR section locators
  // ---------------------------------------------------------------------------

  get gdprParagraph(): Locator {
    return this.page.locator("[data-testid='schools-gdpr-heading'] ~ p");
  }

  gdprParagraphStrong(text: string): Locator {
    return this.gdprParagraph.locator("strong").filter({ hasText: text });
  }

  get gdprList(): Locator {
    return this.page.locator("[data-testid='schools-gdpr-heading'] ~ ul");
  }

  get gdprListFirstItem(): Locator {
    return this.gdprList.locator("li").first();
  }

  // ---------------------------------------------------------------------------
  // Outro card footer
  // ---------------------------------------------------------------------------

  get outroCardFooterParagraph(): Locator {
    return this.outroCard.locator("p.text-xs");
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }

  async hasContentHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => {
      const main = document.querySelector('[data-testid="schools-page-root"]');
      if (!main) return false;
      return main.scrollWidth > main.clientWidth;
    });
  }

  async robotsContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
  }

  async descriptionContent(): Promise<string | null> {
    return this.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('meta[name="description"]'));
      return all.length > 0 ? (all[all.length - 1].getAttribute("content") ?? null) : null;
    });
  }

  async hasNoindexMeta(): Promise<boolean> {
    return this.page.evaluate(() => {
      const el = document.querySelector('meta[name="robots"]');
      return (el?.getAttribute("content") ?? "").includes("noindex");
    });
  }

  async xssMarker(): Promise<unknown> {
    return this.page.evaluate(() => (window as Record<string, unknown>)["__xss"]);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async open(): Promise<void> {
    await this.goto(SchoolsPage.PATH);
  }
}
