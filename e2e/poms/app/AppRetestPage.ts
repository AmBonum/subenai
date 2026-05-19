import { BasePage } from "../BasePage";

export class AppRetestPage extends BasePage {
  static readonly PATH = "/app/retest" as const;

  async open() {
    return this.goto(AppRetestPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-retest-root");
  }

  get pageHeader() {
    return this.page.getByTestId("app-retest-page-header");
  }

  get emptyState() {
    return this.page.getByTestId("app-retest-empty-state");
  }

  get emptyTitle() {
    return this.page.getByTestId("app-retest-empty-title");
  }

  get dueSection() {
    return this.page.getByTestId("app-retest-due-section");
  }

  get dueList() {
    return this.page.getByTestId("app-retest-due-list");
  }

  get upcomingSection() {
    return this.page.getByTestId("app-retest-upcoming-section");
  }

  get upcomingList() {
    return this.page.getByTestId("app-retest-upcoming-list");
  }

  card(id: string) {
    return this.page.getByTestId(`app-retest-card-${id}`);
  }

  cardTitle(id: string) {
    return this.page.getByTestId(`app-retest-card-title-${id}`);
  }

  cardLastSession(id: string) {
    return this.page.getByTestId(`app-retest-card-last-session-${id}`);
  }

  cardSessionsCount(id: string) {
    return this.page.getByTestId(`app-retest-card-sessions-count-${id}`);
  }

  cardScore(id: string) {
    return this.page.getByTestId(`app-retest-card-score-${id}`);
  }

  cardDueIn(id: string) {
    return this.page.getByTestId(`app-retest-card-due-in-${id}`);
  }

  cardRunCta(id: string) {
    return this.page.getByTestId(`app-retest-card-run-${id}`);
  }

  cardSnoozeCta(id: string) {
    return this.page.getByTestId(`app-retest-card-snooze-${id}`);
  }

  cardDismiss(id: string) {
    return this.page.getByTestId(`app-retest-card-dismiss-${id}`);
  }

  cardRetested(id: string) {
    return this.page.getByTestId(`app-retest-card-retested-${id}`);
  }
}
