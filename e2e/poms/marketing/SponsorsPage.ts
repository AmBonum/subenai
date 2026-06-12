import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * POM for the merged /sponsors page (M3): page chrome + the full
 * filterable sponsor grid live on one route. The legacy /sponsors/all
 * URL only exists as a redirect — `openAll()` is kept to exercise it.
 *
 * Locator strategy: data-testid first (§ Test IDs in CLAUDE.md).
 */
export class SponsorsPage extends BasePage {
  static readonly PATH = "/sponsors" as const;
  static readonly PATH_ALL = "/sponsors/all" as const;

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto(SponsorsPage.PATH);
  }

  /** Navigates to the legacy URL; the app redirects to /sponsors. */
  async openAll(): Promise<void> {
    await this.goto(SponsorsPage.PATH_ALL);
  }

  // ---------------------------------------------------------------------------
  // Page chrome
  // ---------------------------------------------------------------------------

  get indexRoot(): Locator {
    return this.page.getByTestId("sponzori-index-root");
  }

  get indexBackLink(): Locator {
    return this.page.getByTestId("sponzori-index-back-link");
  }

  get indexHeading(): Locator {
    return this.page.getByTestId("sponzori-index-heading");
  }

  get indexHero(): Locator {
    return this.page.getByTestId("sponzori-index-hero");
  }

  get indexFooterNote(): Locator {
    return this.page.getByTestId("sponzori-index-footer-note");
  }

  get indexFooterMailto(): Locator {
    return this.page.getByTestId("sponzori-index-footer-mailto");
  }

  // ---------------------------------------------------------------------------
  // State panels
  // ---------------------------------------------------------------------------

  get indexError(): Locator {
    return this.page.getByTestId("sponzori-index-error");
  }

  get indexEmpty(): Locator {
    return this.page.getByTestId("sponzori-index-empty");
  }

  get indexEmptyHeading(): Locator {
    return this.page.getByTestId("sponzori-index-empty-heading");
  }

  get indexEmptyBody(): Locator {
    return this.page.getByTestId("sponzori-index-empty-body");
  }

  get indexEmptyCta(): Locator {
    return this.page.getByTestId("sponzori-index-empty-cta");
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  get filterName(): Locator {
    return this.page.getByTestId("sponzori-vsetci-filter-name");
  }

  get filterDateFrom(): Locator {
    return this.page.getByTestId("sponzori-vsetci-filter-date-from");
  }

  get filterDateTo(): Locator {
    return this.page.getByTestId("sponzori-vsetci-filter-date-to");
  }

  get filterStatus(): Locator {
    return this.page.getByTestId("sponzori-vsetci-filter-status");
  }

  // ---------------------------------------------------------------------------
  // Results grid
  // ---------------------------------------------------------------------------

  get allResults(): Locator {
    return this.page.getByTestId("sponzori-vsetci-results");
  }

  get allCountStatus(): Locator {
    return this.page.getByTestId("sponzori-vsetci-count-status");
  }

  get allCardList(): Locator {
    return this.page.getByTestId("sponzori-vsetci-card-list");
  }

  get allCardItems(): Locator {
    return this.allCardList.locator("li");
  }

  get allEmpty(): Locator {
    return this.page.getByTestId("sponzori-vsetci-empty");
  }

  get allEmptyMessage(): Locator {
    return this.page.getByTestId("sponzori-vsetci-empty-message");
  }

  get allRefundBadge(): Locator {
    return this.page.getByTestId("sponzori-vsetci-refund-badge");
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  async robotsContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
  }

  async canonicalHref(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    );
  }

  async hasContentHorizontalOverflow(rootTestId: string): Promise<boolean> {
    return this.page.evaluate((tid) => {
      const el = document.querySelector(`[data-testid="${tid}"]`);
      if (!el) return false;
      return el.scrollWidth > el.clientWidth;
    }, rootTestId);
  }

  async xssMarker(): Promise<unknown> {
    return this.page.evaluate(() => (window as unknown as Record<string, unknown>)["__xss"]);
  }
}
