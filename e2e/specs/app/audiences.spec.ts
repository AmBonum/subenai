import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedAudience } from "../../seed";
import { AppAudiencesPage } from "../../poms/app/AppAudiencesPage";

test.describe("/app/audiences", () => {
  // TC-01: Empty state renders when no audiences are seeded
  test("TC-01: empty state renders when no audiences are seeded", async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: { respondent_groups: [] },
    });
    const audiences = new AppAudiencesPage(page);

    await test.step("Open /app/audiences", async () => {
      await audiences.open();
    });

    await test.step("Verify page root and new-group button are visible", async () => {
      await expect(audiences.root).toBeVisible();
      await expect(audiences.newGroupButton).toBeVisible();
    });

    await test.step("Verify empty-state card is visible with correct text", async () => {
      await expect(audiences.emptyState).toBeVisible();
      await expect(audiences.emptyState).toHaveText("Zatiaľ žiadne skupiny.");
    });

    await test.step("Verify no audience row cards are in the DOM", async () => {
      await expect(audiences.allListRows).toHaveCount(0);
    });
  });

  // TC-02: List renders with seeded audiences
  test("TC-02: list renders when audiences are seeded", async ({ context, page }) => {
    const aud1 = seedAudience({
      owner_id: EDUCATOR_SESSION.user.id,
      name: "Marketing tím",
      tags: ["tagA"],
    });
    const aud2 = seedAudience({
      owner_id: EDUCATOR_SESSION.user.id,
      name: "Obchodný tím",
      tags: [],
    });

    await setupEducator(context, page, {
      tables: { respondent_groups: [aud1, aud2] },
    });
    const audiences = new AppAudiencesPage(page);

    await test.step("Open /app/audiences", async () => {
      await audiences.open();
    });

    await test.step("Verify empty-state card is not in the DOM", async () => {
      await expect(audiences.emptyState).toHaveCount(0);
    });

    await test.step("Verify row card for first audience is visible with correct name", async () => {
      await expect(audiences.listRow(aud1.id)).toBeVisible();
      await expect(audiences.rowName(aud1.id)).toHaveText("Marketing tím");
    });

    await test.step("Verify row card for second audience is visible with correct name", async () => {
      await expect(audiences.listRow(aud2.id)).toBeVisible();
      await expect(audiences.rowName(aud2.id)).toHaveText("Obchodný tím");
    });
  });

  // TC-03: Create new audience — inline editor opens, fill and save
  test("TC-03: create new audience via inline editor", async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: { respondent_groups: [] },
    });
    const audiences = new AppAudiencesPage(page);

    await test.step("Open /app/audiences", async () => {
      await audiences.open();
    });

    await test.step("Click 'Nová skupina' to open the inline editor", async () => {
      await audiences.newGroupButton.click();
    });

    await test.step("Verify the inline editor is visible", async () => {
      await expect(audiences.editorRoot).toBeVisible();
      await expect(audiences.editorNameInput).toBeVisible();
    });

    await test.step("Type a name into the name input", async () => {
      await audiences.editorNameInput.fill("Nová e2e skupina");
    });

    await test.step("Click Save", async () => {
      await audiences.editorSaveButton.click();
    });

    await test.step("Verify the editor closes and the new row appears in the list", async () => {
      await expect(audiences.editorRoot).toHaveCount(0);
      await expect(audiences.emptyState).toHaveCount(0);
    });
  });

  // TC-04: Edit existing audience — name updated
  test("TC-04: edit existing audience updates the displayed name", async ({ context, page }) => {
    const aud = seedAudience({
      owner_id: EDUCATOR_SESSION.user.id,
      name: "Pôvodný názov",
      tags: [],
    });

    await setupEducator(context, page, {
      tables: { respondent_groups: [aud] },
    });
    const audiences = new AppAudiencesPage(page);

    await test.step("Open /app/audiences", async () => {
      await audiences.open();
    });

    await test.step("Click 'Upraviť' for the seeded audience", async () => {
      await audiences.rowEditButton(aud.id).click();
    });

    await test.step("Verify the editor opens with the existing name pre-filled", async () => {
      await expect(audiences.editorRoot).toBeVisible();
      await expect(audiences.editorNameInput).toHaveValue("Pôvodný názov");
    });

    await test.step("Clear the name input and type the new name", async () => {
      await audiences.editorNameInput.fill("Nový názov");
    });

    await test.step("Click Save", async () => {
      await audiences.editorSaveButton.click();
    });

    await test.step("Verify the editor closes and the row shows the updated name", async () => {
      await expect(audiences.editorRoot).toHaveCount(0);
      await expect(audiences.rowName(aud.id)).toHaveText("Nový názov");
    });
  });

  // TC-05: Delete audience — confirm dialog removes the card
  test("TC-05: delete audience via confirm dialog removes the row card", async ({
    context,
    page,
  }) => {
    const aud = seedAudience({
      owner_id: EDUCATOR_SESSION.user.id,
      name: "Skupina na vymazanie",
      tags: [],
    });

    await setupEducator(context, page, {
      tables: { respondent_groups: [aud] },
    });
    const audiences = new AppAudiencesPage(page);

    await test.step("Open /app/audiences", async () => {
      await audiences.open();
    });

    await test.step("Verify the audience row is present", async () => {
      await expect(audiences.listRow(aud.id)).toBeVisible();
    });

    await test.step("Click 'Vymazať' for the audience", async () => {
      await audiences.rowDeleteButton(aud.id).click();
    });

    await test.step("Verify the confirm dialog is visible with the correct title", async () => {
      await expect(audiences.confirmDialogRoot).toBeVisible();
      await expect(audiences.confirmDialogTitle).toHaveText("Vymazať skupinu?");
    });

    await test.step("Click the confirm button to proceed with deletion", async () => {
      await audiences.confirmDialogConfirm.click();
    });

    await test.step("Verify the confirm dialog closes", async () => {
      await expect(audiences.confirmDialogRoot).toHaveCount(0);
    });

    await test.step("Verify the row card is removed and the empty state is shown", async () => {
      await expect(audiences.listRow(aud.id)).toHaveCount(0);
      await expect(audiences.emptyState).toBeVisible();
    });
  });
});
