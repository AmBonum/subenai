import { BasePage } from "../BasePage";

export class AppNotificationsPage extends BasePage {
  static readonly PATH = "/app/notifications" as const;

  async open() {
    return this.goto(AppNotificationsPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-notifications-root");
  }

  get header() {
    return this.page.getByTestId("app-notifications-page-header");
  }

  get list() {
    return this.page.getByTestId("app-notifications-list");
  }

  get markAll() {
    return this.page.getByTestId("app-notifications-mark-all");
  }

  get filterUnread() {
    return this.page.getByTestId("app-notifications-filter-unread");
  }

  get emptyState() {
    return this.page.getByTestId("app-notifications-empty-state");
  }

  row(id: string) {
    return this.page.getByTestId(`app-notifications-row-${id}`);
  }

  markRead(id: string) {
    return this.page.getByTestId(`app-notifications-mark-read-${id}`);
  }
}
