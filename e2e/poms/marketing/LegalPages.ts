import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

// ---------------------------------------------------------------------------
// PrivacyPage
// ---------------------------------------------------------------------------

export class PrivacyPage extends BasePage {
  static readonly PATH = "/privacy" as const;

  get heading(): Locator {
    return this.page.getByTestId("privacy-heading");
  }

  get backHomeLink(): Locator {
    return this.page.getByTestId("privacy-back-home");
  }

  get processingTable(): Locator {
    return this.page.getByTestId("privacy-processing-table");
  }

  get processingTableRows(): Locator {
    return this.processingTable.locator("tbody tr");
  }

  get rightsHeading(): Locator {
    return this.page.getByTestId("privacy-rights-heading");
  }

  get contactEmail(): Locator {
    return this.page.getByTestId("privacy-contact-email");
  }

  get s8Heading(): Locator {
    return this.page.getByTestId("privacy-s8-heading");
  }

  get s8Callout(): Locator {
    return this.page.getByTestId("privacy-s8-callout");
  }

  async open(): Promise<void> {
    await this.goto(PrivacyPage.PATH);
  }

  async robotsContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
  }

  async hasContentHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return false;
      return main.scrollWidth > main.clientWidth;
    });
  }

  async tableBoundingBox(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    return this.processingTable.boundingBox();
  }
}

// ---------------------------------------------------------------------------
// CookiesPage
// ---------------------------------------------------------------------------

export class CookiesPage extends BasePage {
  static readonly PATH = "/cookies" as const;

  get heading(): Locator {
    return this.page.getByTestId("cookies-heading");
  }

  get backHomeLink(): Locator {
    return this.page.getByTestId("cookies-back-home");
  }

  get versionLine(): Locator {
    return this.page.getByTestId("cookies-version-line");
  }

  get categoryTableWrapper(): Locator {
    return this.page.getByTestId("cookies-category-table-wrapper");
  }

  get categoryTable(): Locator {
    return this.page.getByTestId("cookies-category-table");
  }

  get manageButton(): Locator {
    return this.page.getByTestId("cookies-manage-button");
  }

  get privacyLink(): Locator {
    return this.page.getByTestId("cookies-privacy-link");
  }

  get lastConsent(): Locator {
    return this.page.getByTestId("cookies-last-consent");
  }

  async open(): Promise<void> {
    await this.goto(CookiesPage.PATH);
  }

  async robotsContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
  }

  async tableWrapperOverflowX(): Promise<string> {
    return this.categoryTableWrapper.evaluate((el) => window.getComputedStyle(el).overflowX);
  }

  async hasContentHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return false;
      return main.scrollWidth > main.clientWidth;
    });
  }

  async seedConsentRecord(record: {
    timestamp: number;
    version: string;
    categories: Record<string, boolean>;
  }): Promise<void> {
    await this.page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
      key: "iiq_consent",
      value: JSON.stringify(record),
    });
  }
}

// ---------------------------------------------------------------------------
// ChangelogPage
// ---------------------------------------------------------------------------

export class ChangelogPage extends BasePage {
  static readonly PATH = "/changelog" as const;

  get heading(): Locator {
    return this.page.getByTestId("changelog-heading");
  }

  get list(): Locator {
    return this.page.getByTestId("changelog-list");
  }

  get listItems(): Locator {
    return this.list.locator(":scope > li");
  }

  get emptyState(): Locator {
    return this.page.getByTestId("changelog-empty");
  }

  entry(version: string): Locator {
    return this.page.getByTestId(`changelog-entry-v${version}`);
  }

  async open(hash = ""): Promise<void> {
    await this.goto(`${ChangelogPage.PATH}${hash}`);
  }

  async robotsContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
  }

  async firstEntryDateTime(): Promise<string | null> {
    const timeEl = this.list.locator(":scope > li").first().locator("time").first();
    await timeEl.waitFor({ state: "attached" });
    return timeEl.getAttribute("dateTime");
  }

  async secondEntryDateTime(): Promise<string | null> {
    const timeEl = this.list.locator(":scope > li").nth(1).locator("time").first();
    await timeEl.waitFor({ state: "attached" });
    return timeEl.getAttribute("dateTime");
  }

  async hasContentHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return false;
      return main.scrollWidth > main.clientWidth;
    });
  }

  async isEntryInViewport(version: string): Promise<boolean> {
    return this.entry(version).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
  }

  async xssWindowProp(): Promise<unknown> {
    return this.page.evaluate(() => (window as unknown as Record<string, unknown>).__xss);
  }
}
