import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedAnswerSet } from "../../seed";
import { AdminAnswerSetsIndexPage } from "../../poms/admin/AdminAnswerSetsIndexPage";

const SET_A_ID = "as_e2e_01";
const SET_B_ID = "as_e2e_02";

test.describe("/admin/answer-sets — index", () => {
  // TC-01: Empty state when no answer-sets are seeded
  test("TC-01: empty state renders when answer_sets table is empty", async ({ context, page }) => {
    await setupAdmin(context, page, {
      tables: {
        answer_sets: [],
        answers: [],
        questions: [],
      },
    });
    const sets = new AdminAnswerSetsIndexPage(page);

    await test.step("Open /admin/answer-sets", async () => {
      await sets.open();
    });

    await test.step("Verify page root is visible", async () => {
      await expect(sets.root).toBeVisible();
    });

    await test.step("Verify empty-state paragraph is visible with correct text", async () => {
      await expect(sets.emptyState).toBeVisible();
      await expect(sets.emptyState).toContainText(
        'Žiadne sady. Vytvor prvú kliknutím na „Nová sada".',
      );
    });

    await test.step("Verify no answer-set cards are in the DOM", async () => {
      await expect(sets.row(SET_A_ID)).toHaveCount(0);
    });
  });

  // TC-02: Populated list — cards render with name and category badge
  test("TC-02: populated list renders card with name and no empty state", async ({
    context,
    page,
  }) => {
    const setA = seedAnswerSet({
      id: SET_A_ID,
      name: "E2E ladená sada",
      branch_slugs: ["financie"],
    });

    await setupAdmin(context, page, {
      tables: {
        answer_sets: [setA],
        answers: [],
        questions: [],
      },
    });
    const sets = new AdminAnswerSetsIndexPage(page);

    await test.step("Open /admin/answer-sets", async () => {
      await sets.open();
    });

    await test.step("Verify the card for the seeded answer-set is visible", async () => {
      await expect(sets.row(SET_A_ID)).toBeVisible();
    });

    await test.step("Verify the card contains the set name", async () => {
      await expect(sets.row(SET_A_ID)).toContainText("E2E ladená sada");
    });

    await test.step("Verify empty-state paragraph is not in the DOM", async () => {
      await expect(sets.emptyState).toHaveCount(0);
    });
  });

  // TC-03: Search filter by name narrows the card grid
  test("TC-03: typing a name into the search input hides non-matching cards", async ({
    context,
    page,
  }) => {
    const setA = seedAnswerSet({ id: SET_A_ID, name: "E2E Alpha" });
    const setB = seedAnswerSet({ id: SET_B_ID, name: "E2E Beta" });

    await setupAdmin(context, page, {
      tables: {
        answer_sets: [setA, setB],
        answers: [],
        questions: [],
      },
    });
    const sets = new AdminAnswerSetsIndexPage(page);

    await test.step("Open /admin/answer-sets", async () => {
      await sets.open();
    });

    await test.step("Verify both cards are visible before filtering", async () => {
      await expect(sets.row(SET_A_ID)).toBeVisible();
      await expect(sets.row(SET_B_ID)).toBeVisible();
    });

    await test.step("Type 'Alpha' into the search input", async () => {
      await sets.searchInput.fill("Alpha");
    });

    await test.step("Verify E2E Alpha card is still visible", async () => {
      await expect(sets.row(SET_A_ID)).toBeVisible();
    });

    await test.step("Verify E2E Beta card is not in the DOM and empty state is absent", async () => {
      await expect(sets.row(SET_B_ID)).toHaveCount(0);
      await expect(sets.emptyState).toHaveCount(0);
    });
  });

  // TC-04: Search with no match shows the empty-state paragraph
  test("TC-04: search with no match shows the empty-state paragraph", async ({ context, page }) => {
    const setA = seedAnswerSet({ id: SET_A_ID, name: "E2E Alpha" });

    await setupAdmin(context, page, {
      tables: {
        answer_sets: [setA],
        answers: [],
        questions: [],
      },
    });
    const sets = new AdminAnswerSetsIndexPage(page);

    await test.step("Open /admin/answer-sets", async () => {
      await sets.open();
    });

    await test.step("Type a string that matches no set", async () => {
      await sets.searchInput.fill("zzznomatch");
    });

    await test.step("Verify the seeded card is not in the DOM", async () => {
      await expect(sets.row(SET_A_ID)).toHaveCount(0);
    });

    await test.step("Verify the empty-state paragraph is visible", async () => {
      await expect(sets.emptyState).toBeVisible();
    });
  });

  // TC-05: Clicking the "Upraviť" link navigates to the editor
  test("TC-05: clicking the 'Upraviť' edit link navigates to the answer-set editor", async ({
    context,
    page,
  }) => {
    const setA = seedAnswerSet({ id: SET_A_ID, name: "E2E ladená sada" });

    await setupAdmin(context, page, {
      tables: {
        answer_sets: [setA],
        answers: [],
        questions: [],
      },
    });
    const sets = new AdminAnswerSetsIndexPage(page);

    await test.step("Open /admin/answer-sets", async () => {
      await sets.open();
    });

    await test.step("Verify the card and its edit link are visible", async () => {
      await expect(sets.row(SET_A_ID)).toBeVisible();
      await expect(sets.editLink(SET_A_ID)).toBeVisible();
    });

    await test.step("Click the 'Upraviť' link on the card", async () => {
      await sets.editLink(SET_A_ID).click();
    });

    await test.step("Verify the URL navigates to /admin/answer-sets/as_e2e_01", async () => {
      await expect(page).toHaveURL(/\/admin\/answer-sets\/as_e2e_01/);
    });
  });
});
