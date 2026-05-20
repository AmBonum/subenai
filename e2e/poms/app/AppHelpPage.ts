import { BasePage } from "../BasePage";

export class AppHelpPage extends BasePage {
  static readonly PATH = "/app/help" as const;

  async open() {
    return this.goto(AppHelpPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-help-root");
  }

  get header() {
    return this.page.getByTestId("app-help-page-header");
  }

  get faqList() {
    return this.page.getByTestId("app-help-faq-list");
  }

  get searchInput() {
    return this.page.getByTestId("app-help-search-input");
  }

  get contactCta() {
    return this.page.getByTestId("app-help-contact-cta");
  }

  faqItem(index: number) {
    return this.page.getByTestId(`app-help-faq-item-${index}`);
  }

  faqTrigger(index: number) {
    return this.page.getByTestId(`app-help-faq-trigger-${index}`);
  }

  faqContent(index: number) {
    return this.page.getByTestId(`app-help-faq-content-${index}`);
  }

  get contactCard() {
    return this.page.getByTestId("app-help-contact-card");
  }

  get contactSubtitle() {
    return this.page.getByTestId("app-help-contact-subtitle");
  }

  get pageHeader() {
    return this.page.getByTestId("app-help-page-header");
  }

  // ---- Empty state (no-match search) --------------------------------------
  get emptyState() {
    return this.page.getByTestId("app-help-empty-state");
  }

  get emptyStateTitle() {
    return this.page.getByTestId("app-help-empty-title");
  }

  get emptyStateCta() {
    return this.page.getByTestId("app-help-empty-cta");
  }

  // ---- Quick-links bridge to public legal + changelog ---------------------
  get quickLinksSection() {
    return this.page.getByTestId("app-help-quick-links");
  }

  get quickLinkPrivacy() {
    return this.page.getByTestId("app-help-quick-link-privacy");
  }

  get quickLinkCookies() {
    return this.page.getByTestId("app-help-quick-link-cookies");
  }

  get quickLinkChangelog() {
    return this.page.getByTestId("app-help-quick-link-changelog");
  }

  get quickLinkSchools() {
    return this.page.getByTestId("app-help-quick-link-schools");
  }
}
