import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedTest } from "../../seed";
import type { RpcContext } from "../../mocks/supabase";
import { TestEditorPage } from "../../poms/app/TestEditorPage";

const BASE_TEST = () =>
  seedTest({
    id: "tst_002",
    slug: "e2e-edit-target",
    share_id: "e2e-share-1234",
    owner_id: EDUCATOR_SESSION.user.id,
    title: "Editor target",
    status: "draft",
  });

const BASE_TABLES = (t1: ReturnType<typeof seedTest>) => ({
  tests: [t1],
  test_questions: [],
  sessions: [],
  respondent_groups: [],
});

// Emulates the publish_test RPC (20260611100000): flips the row to
// published so the post-invalidation refetch observes the transition.
const publishTestRpc = (body: unknown, ctx: RpcContext) => {
  const id = (body as { p_test_id?: string } | null)?.p_test_id;
  const row = (ctx.tables.tests ?? []).find((r) => r.id === id);
  if (row) {
    row.status = "published";
    row.published_at = new Date().toISOString();
  }
  return (row?.version as number | undefined) ?? 1;
};

test.describe("/app/tests/$testId editor", () => {
  // TC-01: Editor renders page header title and status badge
  test("TC-01: editor renders page header title and status badge", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the root container is visible", async () => {
      await expect(editor.root).toBeVisible();
    });

    await test.step("Verify the page header title contains 'Editor target'", async () => {
      await expect(editor.pageHeaderTitle).toContainText("Editor target");
    });

    await test.step("Verify the status badge shows 'Koncept'", async () => {
      await expect(editor.statusBadge).toHaveText("Koncept");
    });
  });

  // TC-02: Tab switching updates the visible panel
  test("TC-02: tab switching shows the correct panel", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the results panel is visible on the default tab", async () => {
      await expect(editor.resultsPanel).toBeVisible();
    });

    await test.step("Click the analytics tab trigger", async () => {
      await editor.tabAnalytics.click();
    });

    await test.step("Verify the analytics panel is visible", async () => {
      await expect(editor.analyticsPanel).toBeVisible();
    });

    await test.step("Click the settings tab trigger", async () => {
      await editor.tabSettings.click();
    });

    await test.step("Verify the settings panel is visible", async () => {
      await expect(editor.settingsPanel).toBeVisible();
    });
  });

  // TC-03: Title edit in settings tab persists via save button
  test("TC-03: editing the title and saving fires the mutation without error", async ({ page }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor and navigate to the settings tab", async () => {
      await editor.open("tst_002");
      await editor.tabSettings.click();
    });

    await test.step("Verify the title input is visible", async () => {
      await expect(editor.titleInput).toBeVisible();
    });

    await test.step("Clear the title input and type 'Updated via e2e'", async () => {
      await editor.titleInput.clear();
      await editor.titleInput.fill("Updated via e2e");
    });

    await test.step("Click the save button", async () => {
      await editor.saveButton.click();
    });

    await test.step("Verify the title input retains 'Updated via e2e'", async () => {
      await expect(editor.titleInput).toHaveValue("Updated via e2e");
    });

    await test.step("Verify the save button is re-enabled after the mutation completes", async () => {
      await expect(editor.saveButton).toBeEnabled();
    });
  });

  // TC-04: Publish button (draft only) calls the publish_test RPC and the
  // status badge transitions from "Koncept" to "Publikované"
  test("TC-04: publish button transitions the status badge to 'Publikované' via publish_test", async ({
    page,
  }) => {
    const t1 = BASE_TEST();
    const publishCalls: unknown[] = [];
    await setupEducator(page.context(), page, {
      tables: BASE_TABLES(t1),
      rpcs: {
        publish_test: (body: unknown, ctx: RpcContext) => {
          publishCalls.push(body);
          return publishTestRpc(body, ctx);
        },
      },
    });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the initial status badge shows 'Koncept'", async () => {
      await expect(editor.statusBadge).toHaveText("Koncept");
    });

    await test.step("Click the publish button", async () => {
      await editor.publishButton.click();
    });

    await test.step("Verify the status badge transitions to 'Publikované'", async () => {
      await expect(editor.statusBadge).toHaveText("Publikované");
    });

    await test.step("Verify the publish_test RPC carried the test id", async () => {
      expect(publishCalls).toEqual([{ p_test_id: "tst_002" }]);
    });

    await test.step("Verify the publish button is replaced by 'Zrušiť publikovanie'", async () => {
      await expect(editor.publishButton).toHaveCount(0);
      await expect(editor.unpublishButton).toBeVisible();
    });
  });

  // TC-05: Archive goes through a warning ConfirmDialog; after confirming,
  // the archive button is replaced by "Obnoviť z archívu".
  test("TC-05: archive opens a warning ConfirmDialog and archiving swaps the action to unarchive", async ({
    page,
  }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for the seeded test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the archive button is visible for a draft test", async () => {
      await expect(editor.archiveButton).toBeVisible();
    });

    await test.step("Click archive — the warning dialog opens with dead-link copy", async () => {
      await editor.archiveButton.click();
      await expect(editor.confirmDialog).toBeVisible();
      await expect(editor.confirmDialog).toHaveAttribute("data-severity", "warning");
      await expect(editor.confirmDialog).toContainText("verejný odkaz okamžite prestane fungovať");
    });

    await test.step("Confirm the archive action", async () => {
      await editor.confirmDialogConfirm.click();
    });

    await test.step("Verify archive disappears and unarchive appears", async () => {
      await expect(editor.archiveButton).toHaveCount(0);
      await expect(editor.unarchiveButton).toBeVisible();
    });
  });

  // ----- E45 Phase 1 — Questions tab + Order Mode toggle -----

  // TC-06: Questions tab renders the empty-state when no rows in test_questions.
  test("TC-06: Questions tab shows the empty state for a test with no questions", async ({
    page,
  }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor and click the Questions tab", async () => {
      await editor.open("tst_002");
      await editor.tabQuestions.click();
    });

    await test.step("Verify the questions panel + editor root are visible", async () => {
      await expect(editor.questionsPanel).toBeVisible();
      await expect(editor.questionsRoot).toBeVisible();
    });

    await test.step("Verify the empty-state CTA is rendered (no questions yet)", async () => {
      await expect(editor.questionsEmptyState).toBeVisible();
    });

    await test.step("Verify the count copy mentions 0 / 100", async () => {
      // The count label is "{count} z {max} otázok" — when count=0 it shows
      // "0 z 100 otázok" so we assert on the leading "0".
      await expect(editor.questionsCount).toContainText("0");
    });
  });

  // TC-07: Order Mode toggle in Settings exposes both options + the test's
  // current selection (default "fixed") is reflected in the radio state.
  test("TC-07: Order Mode toggle shows both options with 'fixed' pre-selected by default", async ({
    page,
  }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor and navigate to Settings", async () => {
      await editor.open("tst_002");
      await editor.tabSettings.click();
    });

    await test.step("Verify the Order Mode root + both option cards are rendered", async () => {
      await expect(editor.orderModeRoot).toBeVisible();
      await expect(editor.orderModeFixed).toBeVisible();
      await expect(editor.orderModeRandom).toBeVisible();
    });

    await test.step("Verify the 'fixed' radio is the checked one (default)", async () => {
      await expect(editor.orderModeRadioFixed).toHaveAttribute("data-state", "checked");
      await expect(editor.orderModeRadioRandom).toHaveAttribute("data-state", "unchecked");
    });
  });

  // ----- E45 Phase 2 — Password card in Settings -----

  // TC-08: Password card renders the "unset" status + the Submit button is
  // disabled until a valid 8+ char password is entered into both inputs.
  test("TC-08: Password card disables submit until inputs match + meet 8-char min", async ({
    page,
  }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open Settings tab for a test with no password", async () => {
      await editor.open("tst_002");
      await editor.tabSettings.click();
    });

    await test.step("Verify the Password card is rendered with 'unset' status", async () => {
      await expect(editor.passwordCardRoot).toBeVisible();
      await expect(editor.passwordStatus).toHaveAttribute("data-has-password", "false");
    });

    await test.step("Verify the Submit button is disabled when both inputs are empty", async () => {
      await expect(editor.passwordSubmit).toBeDisabled();
    });

    await test.step("Enter a too-short password — Submit stays disabled", async () => {
      await editor.passwordInput.fill("short");
      await editor.passwordConfirm.fill("short");
      await expect(editor.passwordSubmit).toBeDisabled();
    });

    await test.step("Enter mismatched 8+ char passwords — Submit stays disabled", async () => {
      await editor.passwordInput.fill("good-password-1");
      await editor.passwordConfirm.fill("different-password-1");
      await expect(editor.passwordSubmit).toBeDisabled();
    });

    await test.step("Enter matching 8+ char passwords — Submit enables", async () => {
      await editor.passwordInput.fill("good-password-1");
      await editor.passwordConfirm.fill("good-password-1");
      await expect(editor.passwordSubmit).toBeEnabled();
    });

    await test.step("Verify the Clear button is NOT rendered on an unset test", async () => {
      await expect(editor.passwordClear).toHaveCount(0);
    });
  });

  // TC-09: Password card on a test that ALREADY has a password shows the
  // "set" status + the Clear button + the Submit label reads "Change password".
  test("TC-09: Password card on a locked test shows 'set' status + Clear button", async ({
    page,
  }) => {
    // Seed a test with a non-NULL password_hash so the queries layer derives
    // has_password=true. The hash string itself is never inspected by the
    // client — it's enough for the boolean projection in mapTest.
    const t1 = seedTest({
      id: "tst_002",
      slug: "e2e-edit-target-locked",
      share_id: "e2e-share-locked",
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Locked editor target",
      status: "draft",
      password_hash: "$2a$10$stub-bcrypt-hash-not-real",
      password_hash_version: 3,
    });
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open Settings for the locked test", async () => {
      await editor.open("tst_002");
      await editor.tabSettings.click();
    });

    await test.step("Verify the Password card reports 'set' status", async () => {
      await expect(editor.passwordCardRoot).toBeVisible();
      await expect(editor.passwordStatus).toHaveAttribute("data-has-password", "true");
    });

    await test.step("Verify the Clear button is now rendered", async () => {
      await expect(editor.passwordClear).toBeVisible();
    });
  });

  // ----- E45 Phase 3 — Invite button "Pripravujeme" gate -----

  // TC-10: Invite button on a PUBLISHED test renders with the
  // "Pripravujeme" badge + disabled state + tooltip trigger. Clicking it
  // is a no-op (dialog never opens).
  test("TC-10: Invite button on a published test is gated as Pripravujeme", async ({ page }) => {
    const t1 = seedTest({
      id: "tst_002",
      slug: "e2e-edit-target-pub",
      share_id: "e2e-share-pub",
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Published editor target",
      status: "published",
    });
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor for a published test", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the Invite button is rendered (published test)", async () => {
      await expect(editor.inviteButton).toBeVisible();
    });

    await test.step("Verify the Invite button is disabled and tagged with the gate", async () => {
      await expect(editor.inviteButton).toBeDisabled();
      await expect(editor.inviteButton).toHaveAttribute("data-gate", "coming_soon");
    });

    await test.step("Verify the Pripravujeme badge is rendered inside the button", async () => {
      await expect(editor.inviteComingSoonBadge).toBeVisible();
    });

    await test.step("Verify the tooltip trigger wrapper is present (a11y)", async () => {
      await expect(editor.inviteTooltipTrigger).toBeVisible();
    });
  });

  // TC-11: Invite button is NOT rendered on draft tests — the published-only
  // gate from app.tests.$testId.tsx is the same on the edge case.
  test("TC-11: Invite button is NOT rendered on a draft test", async ({ page }) => {
    const t1 = BASE_TEST(); // draft by default
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open a draft test in the editor", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the Invite button is absent from a draft", async () => {
      await expect(editor.inviteButton).toHaveCount(0);
    });
  });

  // ----- E50 — status-machine exits + zero-sessions empty states -----

  // TC-12: Unpublish (published → draft) goes through a warning
  // ConfirmDialog whose copy warns the /t/ link stops working.
  test("TC-12: unpublish opens a warning dialog and returns the test to 'Koncept'", async ({
    page,
  }) => {
    const t1 = seedTest({
      id: "tst_002",
      slug: "e2e-edit-target-pub",
      share_id: "e2eShare1234",
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Published editor target",
      status: "published",
    });
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the published test — unpublish is visible, publish is not", async () => {
      await editor.open("tst_002");
      await expect(editor.unpublishButton).toBeVisible();
      await expect(editor.publishButton).toHaveCount(0);
    });

    await test.step("Click unpublish — warning dialog with dead-link copy", async () => {
      await editor.unpublishButton.click();
      await expect(editor.confirmDialog).toBeVisible();
      await expect(editor.confirmDialog).toHaveAttribute("data-severity", "warning");
      await expect(editor.confirmDialog).toContainText(
        "Verejný odkaz prestane pre nových respondentov fungovať",
      );
    });

    await test.step("Confirm and verify the badge returns to 'Koncept'", async () => {
      await editor.confirmDialogConfirm.click();
      await expect(editor.statusBadge).toHaveText("Koncept");
      await expect(editor.publishButton).toBeVisible();
    });
  });

  // TC-13: Unarchive (archived → draft) restores the draft actions.
  test("TC-13: unarchive restores an archived test to 'Koncept' with draft actions", async ({
    page,
  }) => {
    const t1 = seedTest({
      id: "tst_002",
      slug: "e2e-edit-target-arch",
      share_id: "e2eShareArch",
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Archived editor target",
      status: "archived",
    });
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the archived test — only unarchive among lifecycle actions", async () => {
      await editor.open("tst_002");
      await expect(editor.unarchiveButton).toBeVisible();
      await expect(editor.publishButton).toHaveCount(0);
      await expect(editor.archiveButton).toHaveCount(0);
    });

    await test.step("Click 'Obnoviť z archívu'", async () => {
      await editor.unarchiveButton.click();
    });

    await test.step("Verify the test is a draft again with publish + archive available", async () => {
      await expect(editor.statusBadge).toHaveText("Koncept");
      await expect(editor.publishButton).toBeVisible();
      await expect(editor.archiveButton).toBeVisible();
    });
  });

  // TC-14: Zero-sessions empty state on a PUBLISHED test surfaces the
  // share-link CTA.
  test("TC-14: published test with 0 sessions shows the copy-link empty state", async ({
    page,
  }) => {
    const t1 = seedTest({
      id: "tst_002",
      slug: "e2e-edit-target-pub2",
      share_id: "e2eSharePub2",
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Published empty target",
      status: "published",
    });
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor (Results tab is the default)", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the empty state carries the share CTA", async () => {
      await expect(editor.sessionsEmpty).toBeVisible();
      await expect(editor.sessionsEmpty).toContainText("Test zatiaľ nemá respondentov.");
      await expect(editor.sessionsEmptyCopyLinkButton).toBeVisible();
      await expect(editor.sessionsEmptyPublishButton).toHaveCount(0);
    });
  });

  // TC-15: Zero-sessions empty state on a DRAFT test asks for publishing and
  // the CTA publishes via publish_test.
  test("TC-15: draft test with 0 sessions shows the publish empty state and the CTA publishes", async ({
    page,
  }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, {
      tables: BASE_TABLES(t1),
      rpcs: { publish_test: publishTestRpc },
    });
    const editor = new TestEditorPage(page);

    await test.step("Open the editor (Results tab is the default)", async () => {
      await editor.open("tst_002");
    });

    await test.step("Verify the empty state asks for publishing", async () => {
      await expect(editor.sessionsEmpty).toBeVisible();
      await expect(editor.sessionsEmpty).toContainText("Test ešte nie je publikovaný.");
      await expect(editor.sessionsEmptyCopyLinkButton).toHaveCount(0);
    });

    await test.step("Click the publish CTA and verify the badge flips", async () => {
      await editor.sessionsEmptyPublishButton.click();
      await expect(editor.statusBadge).toHaveText("Publikované");
    });
  });

  // TC-16: Settings tab — intake-fields card + audience chip render.
  test("TC-16: settings tab renders the intake card and the audience fallback chip", async ({
    page,
  }) => {
    const t1 = BASE_TEST();
    await setupEducator(page.context(), page, { tables: BASE_TABLES(t1) });
    const editor = new TestEditorPage(page);

    await test.step("Open Settings", async () => {
      await editor.open("tst_002");
      await editor.tabSettings.click();
    });

    await test.step("Verify the intake card toggles render unchecked", async () => {
      await expect(editor.intakeRoot).toBeVisible();
      await expect(editor.intakeNameToggle).toHaveAttribute("data-state", "unchecked");
      await expect(editor.intakeEmailToggle).toHaveAttribute("data-state", "unchecked");
    });

    await test.step("Toggle 'Meno' — the required checkbox unlocks", async () => {
      await expect(editor.intakeNameRequired).toBeDisabled();
      await editor.intakeNameToggle.click();
      await expect(editor.intakeNameToggle).toHaveAttribute("data-state", "checked");
      await expect(editor.intakeNameRequired).toBeEnabled();
    });

    await test.step("Verify the audience chip shows the no-group fallback", async () => {
      await expect(editor.audienceChip).toBeVisible();
      await expect(editor.audienceChip).toHaveText(/Bez skupiny/);
    });
  });
});
