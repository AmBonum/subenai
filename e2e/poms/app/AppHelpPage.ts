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
}
