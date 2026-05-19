import { BasePage } from "../BasePage";

/**
 * POMs for the courses surface — `/courses` catalog + `/courses/$slug`
 * detail. Both are anon, static content (no Supabase fetch); search +
 * filter are client-side over the imported `COURSES` bundle.
 */
export class CoursesCatalogPage extends BasePage {
  static readonly PATH = "/courses" as const;

  open() {
    return this.goto(CoursesCatalogPage.PATH);
  }

  get root() {
    return this.page.getByTestId("courses-catalog-root");
  }

  get heading() {
    return this.page.getByTestId("courses-catalog-heading");
  }

  get searchInput() {
    return this.page.getByTestId("courses-catalog-search-input");
  }

  get grid() {
    return this.page.getByTestId("courses-catalog-grid");
  }

  get emptyState() {
    return this.page.getByTestId("courses-catalog-empty");
  }

  card(slug: string) {
    return this.page.getByTestId(`courses-card-${slug}`);
  }

  cardTitle(slug: string) {
    return this.page.getByTestId(`courses-card-title-${slug}`);
  }

  filterChip(category: string) {
    return this.page.getByTestId(`courses-catalog-filter-${category}`);
  }

  // Match only the card links — sub-element testids (title, category)
  // share the same `courses-card-` prefix.
  allCards() {
    return this.page.locator(
      "[data-testid^='courses-card-']:not([data-testid*='-title-']):not([data-testid*='-category-'])",
    );
  }
}

export class CourseDetailPage extends BasePage {
  static path(slug: string) {
    return `/courses/${slug}` as const;
  }

  open(slug: string) {
    return this.goto(CourseDetailPage.path(slug));
  }

  get root() {
    return this.page.getByTestId("course-detail-root");
  }

  get hero() {
    return this.page.getByTestId("course-detail-hero");
  }

  get title() {
    return this.page.getByTestId("course-detail-title");
  }

  get tagline() {
    return this.page.getByTestId("course-detail-tagline");
  }
}
