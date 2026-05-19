import { BasePage } from "../BasePage";

export class AdminIndexPage extends BasePage {
  static readonly PATH = "/admin" as const;

  async open() {
    return this.goto(AdminIndexPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-dashboard-root");
  }

  get errorState() {
    return this.page.getByTestId("admin-dashboard-error");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("admin-dashboard-page-header-title");
  }

  get pageHeaderDescription() {
    return this.page.getByTestId("admin-dashboard-page-header-description");
  }

  get statCardUsers() {
    return this.page.getByTestId("admin-stat-card-users");
  }

  get statCardUsersValue() {
    return this.page.getByTestId("admin-stat-card-users-value");
  }

  get statCardTests() {
    return this.page.getByTestId("admin-stat-card-tests");
  }

  get statCardTestsValue() {
    return this.page.getByTestId("admin-stat-card-tests-value");
  }

  get statCardSessions() {
    return this.page.getByTestId("admin-stat-card-sessions");
  }

  get statCardSessionsValue() {
    return this.page.getByTestId("admin-stat-card-sessions-value");
  }

  get statCardDsrPending() {
    return this.page.getByTestId("admin-stat-card-dsr-pending");
  }

  get statCardDsrPendingValue() {
    return this.page.getByTestId("admin-stat-card-dsr-pending-value");
  }

  get recentActivityCard() {
    return this.page.getByTestId("admin-dashboard-recent-activity");
  }

  get recentActivityEmpty() {
    return this.page.getByTestId("admin-dashboard-recent-activity-empty");
  }

  get sidebarLinkTests() {
    return this.page.getByTestId("admin-shell-sidebar-link-tests");
  }

  get sidebarLinkQuestions() {
    return this.page.getByTestId("admin-shell-sidebar-link-questions");
  }

  get sidebarLinkUsers() {
    return this.page.getByTestId("admin-shell-sidebar-link-users");
  }
}
