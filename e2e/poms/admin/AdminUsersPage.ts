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

  // E46.3 — the *Otvoriť GDPR dossier* (scroll icon) anchor in the
  // per-row action group.
  openDossierLink(userId: string) {
    return this.page.getByTestId(`admin-users-open-dossier-${userId}`);
  }

  // E46.2 — last-GDPR-event column + filter.
  get gdprFilter() {
    return this.page.getByTestId("admin-users-gdpr-filter");
  }

  gdprCell(userId: string) {
    return this.page.getByTestId(`admin-users-gdpr-cell-${userId}`);
  }

  gdprEvent(userId: string) {
    return this.page.getByTestId(`admin-users-gdpr-event-${userId}`);
  }

  gdprOpenDot(userId: string) {
    return this.page.getByTestId(`admin-users-gdpr-open-dot-${userId}`);
  }

  /**
   * Open the Radix Select trigger then click the option matching `label`.
   * The SelectContent is portalled so we locate the option via the page root.
   */
  async selectRoleFilter(label: string) {
    await this.roleFilter.click();
    await this.page.getByRole("option", { name: label }).click();
  }

  async selectGdprFilter(label: string) {
    await this.gdprFilter.click();
    await this.page.getByRole("option", { name: label }).click();
  }
}
