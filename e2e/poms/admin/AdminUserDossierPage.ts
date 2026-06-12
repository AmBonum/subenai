import { BasePage } from "../BasePage";

/**
 * POM for the `/admin/users/<userId>` dossier route (E46.3 MVP).
 *
 * Surfaces the read-side (header + identity + governance sections)
 * and the action toolbar (Art. 15 export, Art. 17 anonymise,
 * hard-delete-with-typed-confirm + the 5-minute pending banner).
 * Mutation flows that depend on the new admin RPCs are NOT yet
 * exercised at the E2E layer — those require RPC mocks per the
 * planner's spec.
 */
export class AdminUserDossierPage extends BasePage {
  static readonly PATH_TEMPLATE = "/admin/users/{userId}";

  async open(userId: string) {
    return this.goto(AdminUserDossierPage.PATH_TEMPLATE.replace("{userId}", userId));
  }

  get root() {
    return this.page.getByTestId("admin-user-dossier-root");
  }

  get backLink() {
    return this.page.getByTestId("admin-user-dossier-back-link");
  }

  get header() {
    return this.page.getByTestId("admin-user-dossier-header");
  }

  get headerName() {
    return this.page.getByTestId("admin-user-dossier-header-name");
  }

  get headerEmail() {
    return this.page.getByTestId("admin-user-dossier-header-email");
  }

  get actionToolbar() {
    return this.page.getByTestId("admin-user-dossier-action-toolbar");
  }

  get exportButton() {
    return this.page.getByTestId("admin-user-dossier-export-button");
  }

  get anonymizeButton() {
    return this.page.getByTestId("admin-user-dossier-anonymize-button");
  }

  get hardDeleteButton() {
    return this.page.getByTestId("admin-user-dossier-hard-delete-button");
  }

  get identitySection() {
    return this.page.getByTestId("admin-user-dossier-section-identity");
  }

  get governanceSection() {
    return this.page.getByTestId("admin-user-dossier-section-governance");
  }

  get governanceEmpty() {
    return this.page.getByTestId("admin-user-dossier-governance-empty");
  }

  get pendingBanner() {
    return this.page.getByTestId("admin-user-dossier-pending-banner");
  }

  get emptyState() {
    return this.page.getByTestId("admin-user-dossier-empty");
  }

  // ── Pending-erasure banner (D-3 hard-delete grace window) ──────────
  get pendingHeading() {
    return this.page.getByTestId("admin-user-dossier-pending-banner");
  }

  get cancelPendingButton() {
    return this.page.getByTestId("admin-user-dossier-cancel-pending-button");
  }

  // ── Art. 16 rectification dialog ───────────────────────────────────
  get rectifyTrigger() {
    return this.page.getByTestId("admin-user-dossier-rectify-display-name");
  }

  get rectifyDialog() {
    return this.page.getByTestId("admin-user-dossier-rectify-dialog");
  }

  get rectifyInput() {
    return this.page.getByTestId("admin-user-dossier-rectify-input");
  }

  get rectifyConfirm() {
    return this.page.getByTestId("admin-user-dossier-rectify-confirm");
  }

  get rectifyCancel() {
    return this.page.getByTestId("admin-user-dossier-rectify-cancel");
  }

  // ── Shared typed-confirm AlertDialog (anonymize + hard-delete) ─────
  get confirmDialog() {
    return this.page.getByTestId("app-shell-confirm-dialog-root");
  }

  get confirmTypedInput() {
    return this.page.getByTestId("app-shell-confirm-dialog-typed-input");
  }

  get confirmButton() {
    return this.page.getByTestId("app-shell-confirm-dialog-confirm");
  }

  get confirmCancel() {
    return this.page.getByTestId("app-shell-confirm-dialog-cancel");
  }

  /** First Sonner toast rendered by the global Toaster. */
  get toast() {
    return this.page.locator("[data-sonner-toast]").first();
  }

  /**
   * Drive a typed-confirm flow: open dialog is assumed already visible;
   * types `value` into the gate input and clicks confirm.
   */
  async typeConfirmAndSubmit(value: string) {
    await this.confirmTypedInput.fill(value);
    await this.confirmButton.click();
  }
}
