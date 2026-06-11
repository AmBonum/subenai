import { BasePage } from "../BasePage";

export class BlogIndexPage extends BasePage {
  static readonly PATH = "/blog" as const;

  async open() {
    return this.goto(BlogIndexPage.PATH);
  }

  get root() {
    return this.page.getByTestId("blog-index-root");
  }

  get title() {
    return this.page.getByTestId("blog-index-title");
  }

  get loading() {
    return this.page.getByTestId("blog-index-loading");
  }

  get errorState() {
    return this.page.getByTestId("blog-index-error");
  }

  get emptyState() {
    return this.page.getByTestId("blog-index-empty");
  }

  get scopeBar() {
    return this.page.getByTestId("blog-scope-bar");
  }

  get clustersSection() {
    return this.page.getByTestId("blog-index-clusters-section");
  }

  get list() {
    return this.page.getByTestId("blog-index-list");
  }

  card(slug: string) {
    return this.page.getByTestId(`blog-post-card-${slug}`);
  }

  cardLink(slug: string) {
    return this.page.getByTestId(`blog-post-card-link-${slug}`);
  }

  cardTitle(slug: string) {
    return this.page.getByTestId(`blog-post-card-title-${slug}`);
  }

  cardExcerpt(slug: string) {
    return this.page.getByTestId(`blog-post-card-excerpt-${slug}`);
  }

  cardDate(slug: string) {
    return this.page.getByTestId(`blog-post-card-date-${slug}`);
  }

  get categoryChipAll() {
    return this.page.getByTestId("blog-category-filter-all");
  }

  categoryChip(slug: string) {
    return this.page.getByTestId(`blog-category-filter-${slug}`);
  }
}
