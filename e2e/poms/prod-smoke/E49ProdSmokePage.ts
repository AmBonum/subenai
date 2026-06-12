// E49 Phase 1c-4 — POM for the prod-smoke canary spec.
//
// Composes the auth + app-shell + sessions-detail surfaces needed by the
// 8 PS-* test cases. Lives in `e2e/poms/prod-smoke/` (not under `app/`)
// to keep the prod-smoke contract isolated — the mock-UI POMs depend on
// fixtures that don't exist against real Supabase.
//
// POM-only locator rule (CLAUDE.md § "Test IDs"): the spec uses these
// getters exclusively. Page-level actions (`page.goto`,
// `page.keyboard.press`) stay in the spec.

import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * Fixed identifiers for the canary test seeded by
 * `supabase/scripts/seed-e49-prodsmoke-data.sql`. Keeping the literals
 * here (rather than importing `e49-fixtures.ts`) makes the prod-smoke
 * surface self-contained — the live-integration namespace is a different
 * data set.
 */
export const E49_PRODSMOKE = {
  ownerId: "e2e00001-e49a-4001-8001-0000aaaaaa01",
  ownerEmail: "e2e-e49-educator-a@subenai.test",
  // SECURITY (2026-06-12 audit): the original literal shipped in this
  // PUBLIC repo and was seeded to prod — burned + rotated. The rotated
  // password lives in 1Password ("subenai e2e-e49 prod") and the
  // E2E_E49_PROD_PASSWORD GitHub Actions secret; it must never be
  // committed. The spec skips loudly when the env var is absent.
  ownerPassword: process.env.E2E_E49_PROD_PASSWORD ?? "",
  testId: "e2e00001-e49a-4001-8001-7e57cab00500",
  shareId: "e2e-e49-prodsmoke-canary",
  title: "E49 prod-smoke canary",
  sessions: {
    completedNamed: "e2e00001-e49a-4001-8001-5e55cab00501",
    completedAnon: "e2e00001-e49a-4001-8001-5e55cab00502",
    inProgress: "e2e00001-e49a-4001-8001-5e55cab00503",
  },
} as const;

export class E49ProdSmokePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // -------------------------------------------------------------- Navigation

  async gotoLogin() {
    return super.goto("/login");
  }

  async gotoTestsIndex() {
    return super.goto("/app/tests");
  }

  async gotoCanaryResults() {
    return super.goto(`/app/tests/${E49_PRODSMOKE.testId}?tab=results`);
  }

  // -------------------------------------------------------------- Login form

  get loginEmail() {
    return this.page.getByTestId("login-email-input");
  }

  get loginPassword() {
    return this.page.getByTestId("login-password-input");
  }

  get loginSubmit() {
    return this.page.getByTestId("login-submit-button");
  }

  async signInAsOwner() {
    await this.loginEmail.fill(E49_PRODSMOKE.ownerEmail);
    await this.loginPassword.fill(E49_PRODSMOKE.ownerPassword);
    await this.loginSubmit.click();
  }

  // ---------------------------------------------------------------- App shell

  get shellRoot() {
    return this.page.getByTestId("app-shell-root");
  }

  get sidebarTestsLink() {
    return this.page.getByTestId("app-shell-sidebar-link-tests");
  }

  get headerLogout() {
    return this.page.getByTestId("app-shell-header-logout");
  }

  // ----------------------------------------------------------- Tests listing

  get testsIndexRoot() {
    return this.page.getByTestId("tests-list-root");
  }

  get canaryRow() {
    return this.page.getByTestId(`tests-list-row-${E49_PRODSMOKE.testId}`);
  }

  get canaryRowOpen() {
    return this.page.getByTestId(`tests-list-row-open-${E49_PRODSMOKE.testId}`);
  }

  // ------------------------------------------------ Test editor — Results tab

  get sessionsListRoot() {
    return this.page.getByTestId("test-sessions-list-root");
  }

  get kpiTotal() {
    return this.page.getByTestId("test-editor-kpi-total");
  }

  get kpiCompleted() {
    return this.page.getByTestId("test-editor-kpi-completed");
  }

  get kpiAvgScore() {
    return this.page.getByTestId("test-editor-kpi-avg-score");
  }

  get exportCsvButton() {
    return this.page.getByTestId("test-sessions-list-export-csv-button");
  }

  /** All visible <tr> rows in the sessions table, in DOM order. */
  get sessionRows() {
    return this.page.locator("tr[data-testid^='test-sessions-list-row-']");
  }

  rowOpen(sessionId: string) {
    return this.page.getByTestId(`test-sessions-list-row-${sessionId}-open`);
  }

  // ----------------------------------------------------------- Side-sheet

  get sheetRoot() {
    return this.page.getByTestId("session-detail-root");
  }

  get sheetClose() {
    return this.page.getByTestId("session-detail-close");
  }
}
