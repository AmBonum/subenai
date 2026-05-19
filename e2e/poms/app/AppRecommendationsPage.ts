import { BasePage } from "../BasePage";

export class AppRecommendationsPage extends BasePage {
  static readonly PATH = "/app/recommendations" as const;

  async open() {
    return this.goto(AppRecommendationsPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-recommendations-root");
  }

  get pageHeader() {
    return this.page.getByTestId("app-recommendations-page-header");
  }

  get emptyState() {
    return this.page.getByTestId("app-recommendations-empty-state");
  }

  get emptyTitle() {
    return this.page.getByTestId("app-recommendations-empty-title");
  }

  get list() {
    return this.page.getByTestId("app-recommendations-list");
  }

  card(id: string) {
    return this.page.getByTestId(`app-recommendations-card-${id}`);
  }

  cardTitle(id: string) {
    return this.page.getByTestId(`app-recommendations-card-title-${id}`);
  }

  cardReason(id: string) {
    return this.page.getByTestId(`app-recommendations-card-reason-${id}`);
  }

  cardMinutes(id: string) {
    return this.page.getByTestId(`app-recommendations-card-minutes-${id}`);
  }

  cardViewCta(id: string) {
    return this.page.getByTestId(`app-recommendations-card-view-${id}`);
  }

  cardDismiss(id: string) {
    return this.page.getByTestId(`app-recommendations-card-dismiss-${id}`);
  }

  cardMarkSent(id: string) {
    return this.page.getByTestId(`app-recommendations-card-mark-sent-${id}`);
  }

  cardSent(id: string) {
    return this.page.getByTestId(`app-recommendations-card-sent-${id}`);
  }
}
