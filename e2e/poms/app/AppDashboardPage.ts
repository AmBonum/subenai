import { BasePage } from "../BasePage";

export class AppDashboardPage extends BasePage {
  static readonly PATH = "/app" as const;

  async open() {
    return this.goto(AppDashboardPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-dashboard-root");
  }

  get header() {
    return this.page.getByTestId("app-dashboard-page-header");
  }

  get statTests() {
    return this.page.getByTestId("app-dashboard-stat-card-tests");
  }

  get statSessions() {
    return this.page.getByTestId("app-dashboard-stat-card-sessions");
  }

  get statRespondents() {
    return this.page.getByTestId("app-dashboard-stat-card-respondents");
  }

  get statCompletion() {
    return this.page.getByTestId("app-dashboard-stat-card-completion");
  }
}
