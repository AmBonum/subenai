import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class TestsIndexPage extends BasePage {
  static readonly PATH = "/tests" as const;

  get heading(): Locator {
    return this.page.getByTestId("tests-catalog-heading");
  }

  get intro(): Locator {
    return this.page.getByTestId("tests-catalog-intro");
  }

  get grid(): Locator {
    return this.page.getByTestId("tests-catalog-grid");
  }

  packCards(): Locator {
    return this.grid.locator(":scope > [data-testid^='tests-catalog-card-']");
  }

  packCard(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-${slug}`);
  }

  packCardTitle(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-title-${slug}`);
  }

  packCardMeta(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-meta-${slug}`);
  }

  // E37 Phase F+I locators — added 2026-05-21 for the DB-backed catalog
  // + Phase I a11y assertions.

  packCardIndustry(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-industry-${slug}`);
  }

  packCardFeaturedBadge(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-featured-${slug}`);
  }

  industryFilterChip(industry: string): Locator {
    return this.page.getByTestId(`tests-catalog-filter-${industry}`);
  }

  /**
   * Every rendered industry filter chip — the chip set varies with the
   * loaded packs, so touch-target specs grab `.first()` of this.
   */
  get filterChips(): Locator {
    return this.page.locator('[data-testid^="tests-catalog-filter-"]');
  }

  /** The visually-hidden (sr-only) h2 above the catalog grid. */
  get srOnlyGridHeading(): Locator {
    return this.page.getByTestId("tests-catalog-grid-heading");
  }

  get filterClearButton(): Locator {
    return this.page.getByTestId("tests-catalog-filter-clear");
  }

  get sortLabel(): Locator {
    return this.page.getByTestId("tests-catalog-sort-label");
  }

  get sortSelect(): Locator {
    return this.page.getByTestId("tests-catalog-sort");
  }

  get resultCountBadge(): Locator {
    return this.page.getByTestId("tests-catalog-result-count");
  }

  get emptyState(): Locator {
    return this.page.getByTestId("tests-catalog-empty");
  }

  get emptyStateClearButton(): Locator {
    return this.page.getByTestId("tests-catalog-empty-clear");
  }

  get standardCta(): Locator {
    return this.page.getByTestId("tests-catalog-cta-standard");
  }

  get coursesCta(): Locator {
    return this.page.getByTestId("tests-catalog-cta-courses");
  }

  async open(): Promise<void> {
    await this.goto(TestsIndexPage.PATH);
  }

  async clickPackCard(slug: string): Promise<void> {
    await this.packCard(slug).click();
  }

  async selectSort(value: "newest" | "questions_desc"): Promise<void> {
    await this.sortSelect.selectOption(value);
  }

  async toggleIndustryFilter(industry: string): Promise<void> {
    await this.industryFilterChip(industry).click();
  }

  async clearFilters(): Promise<void> {
    await this.filterClearButton.click();
  }
}

export class TestPackLandingPage extends BasePage {
  static path(slug: string): string {
    return `/tests/${slug}`;
  }

  get heading(): Locator {
    return this.page.getByTestId("test-pack-heading");
  }

  get tagline(): Locator {
    return this.page.getByTestId("test-pack-tagline");
  }

  get meta(): Locator {
    return this.page.getByTestId("test-pack-meta");
  }

  get metaQuestions(): Locator {
    return this.page.getByTestId("test-pack-meta-questions");
  }

  get metaThreshold(): Locator {
    return this.page.getByTestId("test-pack-meta-threshold");
  }

  get metaIndustry(): Locator {
    return this.page.getByTestId("test-pack-meta-industry");
  }

  get startButton(): Locator {
    return this.page.getByTestId("test-pack-start-button");
  }

  get hero(): Locator {
    return this.page.getByTestId("test-pack-hero");
  }

  // Related-pack strip (E29) — rendered below the detail body.
  get relatedSection(): Locator {
    return this.page.getByTestId("test-pack-related");
  }

  get relatedHeading(): Locator {
    return this.page.getByTestId("test-pack-related-heading");
  }

  get relatedGrid(): Locator {
    return this.page.getByTestId("test-pack-related-grid");
  }

  relatedCards(): Locator {
    return this.relatedGrid.locator(":scope > [data-testid^='tests-catalog-card-']");
  }

  async open(slug: string): Promise<void> {
    await this.goto(TestPackLandingPage.path(slug));
  }

  async clickStart(): Promise<void> {
    await this.startButton.click();
  }
}

export class TestsDirectoryPage {
  readonly index: TestsIndexPage;
  readonly pack: TestPackLandingPage;

  constructor(page: Page) {
    this.index = new TestsIndexPage(page);
    this.pack = new TestPackLandingPage(page);
  }
}
