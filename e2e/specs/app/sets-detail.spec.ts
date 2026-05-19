import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppSetsDetailPage } from "../../poms/app/AppSetsDetailPage";

test.describe("/app/sets/$setId", () => {
  // TC-01: Valid set renders title, correct column header, and incorrect column header
  test("TC-01: valid set renders title, correct column header, and incorrect column header", async ({
    page,
  }) => {
    await setupEducator(page.context(), page);
    const setsDetail = new AppSetsDetailPage(page);

    await test.step("Navigate to /app/sets/as_001", async () => {
      await setsDetail.open("as_001");
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(setsDetail.root).toBeVisible();
    });

    await test.step("Verify the page header wrapper is visible", async () => {
      await expect(setsDetail.pageHeaderWrapper).toBeVisible();
    });

    await test.step('Verify the heading contains "SMS podvody — základná sada"', async () => {
      await expect(setsDetail.pageHeaderTitle).toContainText("SMS podvody — základná sada");
    });

    await test.step('Verify the correct-answers column is visible with heading "Správne odpovede"', async () => {
      await expect(setsDetail.correctColumn).toBeVisible();
      await expect(setsDetail.correctColumn).toContainText("Správne odpovede");
    });

    await test.step('Verify the incorrect-answers column is visible with heading "Nesprávne odpovede"', async () => {
      await expect(setsDetail.incorrectColumn).toBeVisible();
      await expect(setsDetail.incorrectColumn).toContainText("Nesprávne odpovede");
    });
  });

  // TC-02: Correct and incorrect answer rows are rendered
  test("TC-02: correct and incorrect answer rows are rendered for a populated set", async ({
    page,
  }) => {
    await setupEducator(page.context(), page);
    const setsDetail = new AppSetsDetailPage(page);

    await test.step("Navigate to /app/sets/as_001", async () => {
      await setsDetail.open("as_001");
    });

    await test.step("Verify the first correct-answer row is visible", async () => {
      await expect(setsDetail.correctRow(0)).toBeVisible();
    });

    await test.step("Verify at least 4 correct-answer rows are rendered", async () => {
      await expect(setsDetail.correctRow(0)).toBeVisible();
      await expect(setsDetail.correctRow(1)).toBeVisible();
      await expect(setsDetail.correctRow(2)).toBeVisible();
      await expect(setsDetail.correctRow(3)).toBeVisible();
    });

    await test.step("Verify the first incorrect-answer row is visible", async () => {
      await expect(setsDetail.incorrectRow(0)).toBeVisible();
    });

    await test.step("Verify the empty-correct and empty-incorrect messages are not visible", async () => {
      await expect(setsDetail.correctColumn).not.toContainText(
        "Sada nemá žiadne správne odpovede.",
      );
      await expect(setsDetail.incorrectColumn).not.toContainText(
        "Sada nemá žiadne nesprávne odpovede.",
      );
    });
  });

  // TC-03: Unknown set id renders not-found card
  test("TC-03: unknown set id renders not-found card", async ({ page }) => {
    await setupEducator(page.context(), page);
    const setsDetail = new AppSetsDetailPage(page);

    await test.step("Navigate to /app/sets/as_does_not_exist", async () => {
      await setsDetail.open("as_does_not_exist");
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(setsDetail.root).toBeVisible();
    });

    await test.step("Verify the not-found card is visible", async () => {
      await expect(setsDetail.notFoundCard).toBeVisible();
    });

    await test.step('Verify the not-found title reads "Sada sa nenašla"', async () => {
      await expect(setsDetail.notFoundTitle).toHaveText("Sada sa nenašla");
    });

    await test.step('Verify the not-found description contains the unknown set id "as_does_not_exist"', async () => {
      await expect(setsDetail.notFoundDescription).toContainText("as_does_not_exist");
    });

    await test.step("Verify the correct-answers column is not rendered", async () => {
      await expect(setsDetail.correctColumn).toHaveCount(0);
    });

    await test.step("Verify the incorrect-answers column is not rendered", async () => {
      await expect(setsDetail.incorrectColumn).toHaveCount(0);
    });
  });

  // TC-04: Back button navigates to /app/library
  test("TC-04: back button navigates to /app/library", async ({ page }) => {
    await setupEducator(page.context(), page);
    const setsDetail = new AppSetsDetailPage(page);

    await test.step("Navigate to /app/sets/as_001", async () => {
      await setsDetail.open("as_001");
    });

    await test.step("Verify the back button is visible", async () => {
      await expect(setsDetail.backButton).toBeVisible();
    });

    await test.step("Click the back button", async () => {
      await setsDetail.clickBackButton();
    });

    await test.step("Verify the URL is now /app/library", async () => {
      await expect(page).toHaveURL(/\/app\/library/);
    });
  });
});
