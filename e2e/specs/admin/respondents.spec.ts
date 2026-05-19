import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedRespondent } from "../../seed";
import { seedSession } from "../../seed";
import { AdminRespondentsPage } from "../../poms/admin/AdminRespondentsPage";

const RESP_ID = "resp_e2e_001";

const BASE_RPCS = {
  log_audit_event: null,
};

test.describe("/admin/respondents", () => {
  // TC-01: Empty state renders when respondents list is empty
  test("TC-01: empty state renders when respondents list is empty", async ({ context, page }) => {
    await setupAdmin(context, page, {
      tables: {
        respondents: [],
        sessions: [],
        tests: [],
      },
      rpcs: BASE_RPCS,
    });
    const respondents = new AdminRespondentsPage(page);

    await test.step("Navigate to /admin/respondents", async () => {
      await respondents.open();
    });

    await test.step("Verify page root is visible", async () => {
      await expect(respondents.root).toBeVisible();
    });

    await test.step("Verify page header title reads 'Respondenti'", async () => {
      await expect(respondents.pageHeaderTitle).toHaveText("Respondenti");
    });

    await test.step("Verify page header description reads the zero-count line", async () => {
      await expect(respondents.pageHeaderDescription).toHaveText(
        "0 respondentov · prístup k PII sa loguje.",
      );
    });

    await test.step("Verify empty-state card is visible with the correct message", async () => {
      await expect(respondents.emptyState).toBeVisible();
      await expect(respondents.emptyState).toContainText("Žiadni respondenti.");
    });

    await test.step("Verify the table is not in the DOM", async () => {
      await expect(respondents.table).toHaveCount(0);
    });
  });

  // TC-02: Populated list shows respondent row with name, email, and view button
  test("TC-02: populated list shows respondent row with name, email, and view button", async ({
    context,
    page,
  }) => {
    const respondent = seedRespondent({
      id: RESP_ID,
      display_name: "Jana Nováková",
      email: "jana@e2e.test",
      anonymized_at: null,
    });
    const session = seedSession({ respondent_id: RESP_ID });

    await setupAdmin(context, page, {
      tables: {
        respondents: [respondent],
        sessions: [session],
        tests: [],
      },
      rpcs: BASE_RPCS,
    });
    const respondents = new AdminRespondentsPage(page);

    await test.step("Navigate to /admin/respondents", async () => {
      await respondents.open();
    });

    await test.step("Verify the respondents table is visible", async () => {
      await expect(respondents.table).toBeVisible();
    });

    await test.step("Verify the respondent row is visible", async () => {
      await expect(respondents.row(RESP_ID)).toBeVisible();
    });

    await test.step("Verify the row contains the respondent's name and email", async () => {
      await expect(respondents.row(RESP_ID)).toContainText("Jana Nováková");
      await expect(respondents.row(RESP_ID)).toContainText("jana@e2e.test");
    });

    await test.step("Verify the view button is visible", async () => {
      await expect(respondents.viewButton(RESP_ID)).toBeVisible();
    });
  });

  // TC-03: Clicking the view button fires the PII-access toast
  test("TC-03: clicking the view button fires the PII-access toast", async ({ context, page }) => {
    const respondent = seedRespondent({
      id: RESP_ID,
      display_name: "Jana Nováková",
      email: "jana@e2e.test",
      anonymized_at: null,
    });
    const session = seedSession({ respondent_id: RESP_ID });

    await setupAdmin(context, page, {
      tables: {
        respondents: [respondent],
        sessions: [session],
        tests: [],
      },
      rpcs: BASE_RPCS,
    });
    const respondents = new AdminRespondentsPage(page);

    await test.step("Navigate to /admin/respondents", async () => {
      await respondents.open();
    });

    await test.step("Verify the respondent row is visible before clicking", async () => {
      await expect(respondents.row(RESP_ID)).toBeVisible();
    });

    await test.step("Click the view button for the seeded respondent", async () => {
      await respondents.viewButton(RESP_ID).click();
    });

    await test.step("Verify the PII-access toast appears with the correct text", async () => {
      await expect(respondents.toast).toBeVisible({ timeout: 4000 });
      await expect(respondents.toast).toContainText("Prístup k PII zalogovaný.");
    });
  });
});
