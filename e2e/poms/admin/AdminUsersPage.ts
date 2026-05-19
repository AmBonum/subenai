import { BasePage } from "../BasePage";

export class AdminUsersPage extends BasePage {
  static readonly PATH = "/admin/users" as const;

  async open() {
    return this.goto(AdminUsersPage.PATH);
  }

  get root() {
    return this.page.getByTestId("admin-users-root");
  }

  get searchInput() {
    return this.page.getByTestId("admin-users-search-input");
  }

  get roleFilter() {
    return this.page.getByTestId("admin-users-role-filter");
  }

  get table() {
    return this.page.getByTestId("admin-users-table");
  }

  get emptyState() {
    return this.page.getByTestId("admin-users-empty-state");
  }

  /** First Sonner toast rendered by the global Toaster. */
  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  row(userId: string) {
    return this.page.getByTestId(`admin-users-row-${userId}`);
  }

  roleBadge(userId: string) {
    return this.page.getByTestId(`admin-users-role-badge-${userId}`);
  }

  editRoleButton(userId: string) {
    return this.page.getByTestId(`admin-users-edit-role-${userId}`);
  }

  /**
   * Open the Radix Select trigger then click the option matching `label`.
   * The SelectContent is portalled so we locate the option via the page root.
   */
  async selectRoleFilter(label: string) {
    await this.roleFilter.click();
    await this.page.getByRole("option", { name: label }).click();
  }
}
