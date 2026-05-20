import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * POM for the /courses catalog page extensions added by E36 (search,
 * sort, category + audience filters, FAQ, skeleton). Specs MUST go
 * through these getters — no raw page.locator / getByTestId in tests.
 *
 * Locators target the canonical test-ids declared in
 * `tasks/stories/E36-courses-catalog.md`. Some test-ids are still
 * being wired by the implementing agents — the POM ships the
 * agreed surface so the spec compiles + runs the moment they land.
 */
export class CoursesCatalog extends BasePage {
  static readonly PATH = "/courses" as const;

  open() {
    return this.goto(CoursesCatalog.PATH);
  }

  get root(): Locator {
    return this.page.getByTestId("courses-catalog-root");
  }

  get heading(): Locator {
    return this.page.getByTestId("courses-catalog-heading");
  }

  get intro(): Locator {
    return this.page.getByTestId("courses-catalog-intro");
  }

  get searchInput(): Locator {
    return this.page.getByTestId("courses-catalog-search-input");
  }

  get sortSelect(): Locator {
    return this.page.getByTestId("courses-catalog-sort-select");
  }

  get filterSection(): Locator {
    return this.page.getByTestId("courses-catalog-filter-section");
  }

  get filterClearAll(): Locator {
    return this.page.getByTestId("courses-catalog-filter-clear-all");
  }

  get audienceSection(): Locator {
    return this.page.getByTestId("courses-catalog-audience-section");
  }

  get grid(): Locator {
    return this.page.getByTestId("courses-catalog-grid");
  }

  get emptyState(): Locator {
    return this.page.getByTestId("courses-catalog-empty");
  }

  // Card-level locators take the course slug as input so specs read
  // as `catalog.card("sms-smishing")` not `catalog.card(0)` — the
  // index would shift under sorting.
  card(slug: string): Locator {
    return this.page.getByTestId(`courses-card-${slug}`);
  }

  cardTitle(slug: string): Locator {
    return this.page.getByTestId(`courses-card-title-${slug}`);
  }

  cardTitleLink(slug: string): Locator {
    return this.page.getByTestId(`courses-card-title-link-${slug}`);
  }

  cardDifficulty(slug: string): Locator {
    return this.page.getByTestId(`courses-card-difficulty-${slug}`);
  }

  cardMinutes(slug: string): Locator {
    return this.page.getByTestId(`courses-card-minutes-${slug}`);
  }

  categoryFilter(cat: string): Locator {
    return this.page.getByTestId(`courses-catalog-filter-${cat}`);
  }

  audienceFilter(audience: string): Locator {
    return this.page.getByTestId(`courses-catalog-audience-${audience}`);
  }

  // Returns the locator that matches every visible card. Mirrors the
  // existing pattern in `e2e/poms/quiz/CoursesPage.ts#allCards` so the
  // new POM family stays consistent.
  allCards(): Locator {
    return this.page.locator(
      "[data-testid^='courses-card-']:not([data-testid*='-title-']):not([data-testid*='-title-link-']):not([data-testid*='-category-']):not([data-testid*='-hero-']):not([data-testid*='-difficulty-']):not([data-testid*='-minutes-']):not([data-testid*='-related-article'])",
    );
  }

  async typeSearch(q: string): Promise<void> {
    await this.searchInput.fill(q);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill("");
  }

  async selectSort(value: "newest" | "shortest" | "beginner"): Promise<void> {
    await this.sortSelect.selectOption(value);
  }

  async toggleCategory(cat: string): Promise<void> {
    await this.categoryFilter(cat).click();
  }

  async toggleAudience(audience: string): Promise<void> {
    await this.audienceFilter(audience).click();
  }
}
