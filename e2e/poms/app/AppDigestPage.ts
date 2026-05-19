import { BasePage } from "../BasePage";

export class AppDigestPage extends BasePage {
  static readonly PATH = "/app/digest" as const;

  async open() {
    return this.goto(AppDigestPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-digest-root");
  }

  get pageHeader() {
    return this.page.getByTestId("app-digest-page-header");
  }

  get pageHeaderEyebrow() {
    return this.page.getByTestId("app-shell-page-header-eyebrow");
  }

  get emptyState() {
    return this.page.getByTestId("app-digest-empty-state");
  }

  get emptyTitle() {
    return this.page.getByTestId("app-digest-empty-title");
  }

  get list() {
    return this.page.getByTestId("app-digest-list");
  }

  card(id: string) {
    return this.page.getByTestId(`app-digest-card-${id}`);
  }

  cardPeriod(id: string) {
    return this.page.getByTestId(`app-digest-card-period-${id}`);
  }

  cardSessions(id: string) {
    return this.page.getByTestId(`app-digest-card-sessions-${id}`);
  }

  cardCompletion(id: string) {
    return this.page.getByTestId(`app-digest-card-completion-${id}`);
  }

  cardTopTest(id: string) {
    return this.page.getByTestId(`app-digest-card-top-test-${id}`);
  }

  cardTopTestCta(id: string) {
    return this.page.getByTestId(`app-digest-card-top-test-cta-${id}`);
  }

  cardWeakest(id: string) {
    return this.page.getByTestId(`app-digest-card-weakest-${id}`);
  }
}
