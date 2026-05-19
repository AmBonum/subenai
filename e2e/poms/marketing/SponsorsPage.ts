import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * POM for the /sponsors index page and /sponsors/all filterable list.
 *
 * Both routes are covered here because they share the same data domain
 * (public_sponsors) and test plan file. The `open()` method defaults to
 * /sponsors; call `openAll()` for /sponsors/all.
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

  async openAll(): Promise<void> {
    await this.goto(SponsorsPage.PATH_ALL);
  }

  // ---------------------------------------------------------------------------
  // /sponsors index — structural
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

  get indexLatestSection(): Locator {
    return this.page.getByTestId("sponzori-index-latest-section");
  }

  get indexAllLink(): Locator {
    return this.page.getByTestId("sponzori-index-all-link");
  }

  get indexFooterNote(): Locator {
    return this.page.getByTestId("sponzori-index-footer-note");
  }

  get indexFooterMailto(): Locator {
    return this.page.getByTestId("sponzori-index-footer-mailto");
  }

  // ---------------------------------------------------------------------------
  // /sponsors index — state panels
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
  // /sponsors index — accordion (Radix UI Accordion rendered as region)
  // The accordion is inside the `sponzori-index-latest-section` region.
  // AccordionItem triggers are buttons within the Accordion's region element.
  // ---------------------------------------------------------------------------

  get indexAccordion(): Locator {
    return this.indexLatestSection
      .getByRole("group")
      .or(this.indexLatestSection.locator("[aria-label]"))
      .first();
  }

  get indexAccordionItems(): Locator {
    return this.indexLatestSection.locator("[data-radix-collection-item]");
  }

  /** Returns the AccordionTrigger button for the item with the given display name. */
  accordionTrigger(displayName: string): Locator {
    return this.indexLatestSection.getByRole("button", { name: new RegExp(displayName, "i") });
  }

  /** The refund badge inside the index accordion. */
  get indexRefundBadge(): Locator {
    return this.page.getByTestId("sponzori-refund-badge");
  }

  // ---------------------------------------------------------------------------
  // /sponsors/all — structural
  // ---------------------------------------------------------------------------

  get allRoot(): Locator {
    return this.page.getByTestId("sponzori-vsetci-root");
  }

  get allBackLink(): Locator {
    return this.page.getByTestId("sponzori-vsetci-back-link");
  }

  get allHeading(): Locator {
    return this.page.getByTestId("sponzori-vsetci-heading");
  }

  get allFooterNote(): Locator {
    return this.page.getByTestId("sponzori-vsetci-footer-note");
  }

  // ---------------------------------------------------------------------------
  // /sponsors/all — filters
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
  // /sponsors/all — results
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

  get allError(): Locator {
    return this.page.getByTestId("sponzori-vsetci-error");
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
    return this.page.evaluate(() => (window as Record<string, unknown>)["__xss"]);
  }
}
