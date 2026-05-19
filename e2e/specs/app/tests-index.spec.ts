import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedTest } from "../../seed";
import { AppTestsIndexPage } from "../../poms/app/AppTestsIndexPage";

test.describe("/app/tests", () => {
  // TC-01: Empty state renders when educator has no tests
  test("TC-01: empty state renders when educator has no tests", async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: { tests: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify page root and new-test button are visible", async () => {
      await expect(testsIndex.root).toBeVisible();
      await expect(testsIndex.newTestButton).toBeVisible();
    });

    await test.step("Verify empty-state card is visible with correct text", async () => {
      await expect(testsIndex.emptyState).toBeVisible();
      await expect(testsIndex.emptyState).toHaveText("Žiadne testy v tomto filtri.");
    });

    await test.step("Verify no test row cards are in the DOM", async () => {
      await expect(testsIndex.allListRows).toHaveCount(0);
    });
  });

  // TC-02: List renders when tests are seeded
  test("TC-02: list renders when tests are seeded", async ({ context, page }) => {
    const draft = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Draft test E2E",
      status: "draft",
    });
    const published = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Published test E2E",
      status: "published",
    });

    await setupEducator(context, page, {
      tables: { tests: [draft, published] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify empty-state card is not in the DOM", async () => {
      await expect(testsIndex.emptyState).toHaveCount(0);
    });

    await test.step("Verify row card for the draft test is visible with correct title", async () => {
      await expect(testsIndex.listRow(draft.id)).toBeVisible();
      await expect(testsIndex.rowTitle(draft.id)).toHaveText("Draft test E2E");
    });

    await test.step("Verify row card for the published test is visible with correct title", async () => {
      await expect(testsIndex.listRow(published.id)).toBeVisible();
      await expect(testsIndex.rowTitle(published.id)).toHaveText("Published test E2E");
    });
  });

  // TC-03: Status filter hides non-matching tests
  test("TC-03: status filter hides non-matching tests", async ({ context, page }) => {
    const draft = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Draft test E2E",
      status: "draft",
    });
    const published = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Published test E2E",
      status: "published",
    });

    await setupEducator(context, page, {
      tables: { tests: [draft, published] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify both rows are visible initially", async () => {
      await expect(testsIndex.listRow(draft.id)).toBeVisible();
      await expect(testsIndex.listRow(published.id)).toBeVisible();
    });

    await test.step("Click the 'Drafty' status tab", async () => {
      await testsIndex.statusTab("draft").click();
    });

    await test.step("Verify only the draft test row is visible", async () => {
      await expect(testsIndex.listRow(draft.id)).toBeVisible();
    });

    await test.step("Verify the published test row is not in the DOM", async () => {
      await expect(testsIndex.listRow(published.id)).toHaveCount(0);
    });
  });

  // TC-04: "Nový test" button navigates to /app/tests/new
  test("TC-04: 'Nový test' button navigates to /app/tests/new", async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: { tests: [] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Click the 'Nový test' button", async () => {
      await testsIndex.newTestButton.click();
    });

    await test.step("Verify the URL changes to /app/tests/new", async () => {
      await expect(page).toHaveURL(/\/app\/tests\/new/);
    });
  });

  // TC-05: Clicking "Otvoriť" navigates to the test editor
  test("TC-05: clicking 'Otvoriť' navigates to the test editor", async ({ context, page }) => {
    const t = seedTest({
      owner_id: EDUCATOR_SESSION.user.id,
      title: "Editor navigation test",
      status: "draft",
    });

    await setupEducator(context, page, {
      tables: { tests: [t] },
    });
    const testsIndex = new AppTestsIndexPage(page);

    await test.step("Open /app/tests", async () => {
      await testsIndex.open();
    });

    await test.step("Verify the seeded test row is visible", async () => {
      await expect(testsIndex.listRow(t.id)).toBeVisible();
    });

    await test.step("Click the 'Otvoriť' button for the seeded test", async () => {
      await testsIndex.rowOpenButton(t.id).click();
    });

    await test.step("Verify the URL changes to /app/tests/<id>", async () => {
      await expect(page).toHaveURL(new RegExp(`/app/tests/${t.id}`));
    });
  });
});
