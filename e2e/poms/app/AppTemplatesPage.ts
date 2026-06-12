import { BasePage } from "../BasePage";

/**
 * /app/templates — public/mine tabbed template library (E44).
 * Cards are <TemplateCard> instances with `templates-card-<id>-*` testids.
 */
export class AppTemplatesPage extends BasePage {
  static readonly PATH = "/app/templates" as const;

  async open() {
    return this.goto(AppTemplatesPage.PATH);
  }

  get root() {
    return this.page.getByTestId("templates-root");
  }

  get pageHeader() {
    return this.page.getByTestId("templates-page-header");
  }

  get searchInput() {
    return this.page.getByTestId("templates-list-search-input");
  }

  get categoryFilter() {
    return this.page.getByTestId("templates-list-category-filter");
  }

  categoryFilterOption(value: string) {
    return this.page.getByTestId(`templates-list-category-option-${value}`);
  }

  get resultCount() {
    return this.page.getByTestId("templates-list-result-count");
  }

  // Tabs -----------------------------------------------------------------
  get tabPublic() {
    return this.page.getByTestId("templates-tab-public");
  }

  get tabMine() {
    return this.page.getByTestId("templates-tab-mine");
  }

  // Empty states ----------------------------------------------------------
  /** Public tab — zero rows OR active filter matches nothing. */
  get emptyStatePublic() {
    return this.page.getByTestId("templates-list-empty-state-public");
  }

  /** Mine tab — no copies yet, or filter matches nothing. */
  get emptyStateMine() {
    return this.page.getByTestId("templates-list-empty-state-mine");
  }

  // Cards -----------------------------------------------------------------
  card(id: string) {
    return this.page.getByTestId(`templates-card-${id}`);
  }

  cardTitle(id: string) {
    return this.page.getByTestId(`templates-card-${id}-title`);
  }

  cardQuestionsCount(id: string) {
    return this.page.getByTestId(`templates-card-${id}-questions-count`);
  }

  cardPurposeBadge(id: string) {
    return this.page.getByTestId(`templates-card-${id}-purpose-badge`);
  }

  cardOwnershipBadge(id: string) {
    return this.page.getByTestId(`templates-card-${id}-ownership-badge`);
  }

  cardPublicPageLink(id: string) {
    return this.page.getByTestId(`templates-card-${id}-public-page-link`);
  }

  useButton(id: string) {
    return this.page.getByTestId(`templates-card-${id}-use-button`);
  }

  get allCards() {
    // Card roots carry `data-template-card="root"` (also used by the
    // page's J/K keyboard navigation) — sub-elements share the
    // `templates-card-` testid prefix, so the data attribute is the only
    // selector that counts whole cards.
    return this.page.locator('[data-template-card="root"]');
  }
}
