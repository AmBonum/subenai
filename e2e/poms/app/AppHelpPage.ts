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
}
