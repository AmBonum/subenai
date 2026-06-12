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

  get statTestsValue() {
    return this.page.getByTestId("app-dashboard-stat-card-tests-value");
  }

  get statSessionsValue() {
    return this.page.getByTestId("app-dashboard-stat-card-sessions-value");
  }

  get statCompletionValue() {
    return this.page.getByTestId("app-dashboard-stat-card-completion-value");
  }

  get emptyState() {
    return this.page.getByTestId("app-dashboard-empty-state");
  }

  get emptyTitle() {
    return this.page.getByTestId("app-dashboard-empty-title");
  }

  get emptyCtaPrimary() {
    return this.page.getByTestId("app-dashboard-empty-cta-primary");
  }

  get emptyCtaSecondary() {
    return this.page.getByTestId("app-dashboard-empty-cta-secondary");
  }

  get statsSection() {
    return this.page.getByTestId("app-dashboard-stats-section");
  }

  get pageHeaderEyebrow() {
    return this.page.getByTestId("app-shell-page-header-eyebrow");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("app-shell-page-header-title");
  }

  get shellHeaderUserName() {
    return this.page.getByTestId("app-shell-header-user-name");
  }

  get draftsCard() {
    return this.page.getByTestId("app-dashboard-drafts-card");
  }

  draftsRow(id: string) {
    return this.page.getByTestId(`app-dashboard-drafts-row-${id}`);
  }

  get loadingSkeleton() {
    return this.page.getByTestId("app-dashboard-loading");
  }

  get errorState() {
    return this.page.getByTestId("app-dashboard-error-state");
  }

  get errorTitle() {
    return this.page.getByTestId("app-dashboard-error-title");
  }

  get errorRetry() {
    return this.page.getByTestId("app-dashboard-error-retry");
  }

  // ---- "Pre teba" insights rail (M4) ----

  get insightsCard() {
    return this.page.getByTestId("app-dashboard-insights-card");
  }

  get insightsCardTitle() {
    return this.page.getByTestId("app-dashboard-insights-card-title");
  }

  insightsCardLink(tab: "digest" | "recommendations" | "retest" | "peer") {
    return this.page.getByTestId(`app-dashboard-insights-card-link-${tab}`);
  }

  insightsCardSummary(tab: "digest" | "recommendations" | "retest" | "peer") {
    return this.page.getByTestId(`app-dashboard-insights-card-summary-${tab}`);
  }
}
