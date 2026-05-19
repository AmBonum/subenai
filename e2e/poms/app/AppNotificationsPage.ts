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

  rowBadge(id: string) {
    return this.page.getByTestId(`app-notifications-badge-${id}`);
  }

  rowTitle(id: string) {
    return this.page.getByTestId(`app-notifications-title-${id}`);
  }

  rowUnreadDot(id: string) {
    return this.page.getByTestId(`app-notifications-unread-dot-${id}`);
  }

  markRead(id: string) {
    return this.page.getByTestId(`app-notifications-mark-read-${id}`);
  }

  async clickMarkRead(id: string) {
    await this.markRead(id).click();
  }

  async clickMarkAll() {
    await this.markAll.click();
  }

  async clickFilterUnread() {
    await this.filterUnread.click();
  }
}
