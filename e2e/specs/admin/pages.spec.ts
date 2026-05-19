import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedCmsPage } from "../../seed";
import { AdminPagesIndexPage } from "../../poms/admin/AdminPagesIndexPage";
import { AdminPagesEditorPage } from "../../poms/admin/AdminPagesEditorPage";

// ---------------------------------------------------------------------------
// List — /admin/pages
// ---------------------------------------------------------------------------

test.describe("/admin/pages — CMS pages list", () => {
  // TC-01: Empty state when no pages are seeded
  test("TC-01: empty state renders when no pages are seeded", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { cms_pages: [] } });
    const index = new AdminPagesIndexPage(page);

    await test.step("Navigate to /admin/pages", async () => {
      await index.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(index.root).toBeVisible();
    });

    await test.step('Verify the empty-state cell is visible with text "Zatiaľ žiadne stránky."', async () => {
      await expect(index.emptyState).toBeVisible();
      await expect(index.emptyState).toHaveText("Zatiaľ žiadne stránky.");
    });
  });

  // TC-02: Populated list — rows render with title, slug, and status badge
  test("TC-02: populated list renders rows with title and status badge", async ({
    context,
    page,
  }) => {
    const draft = seedCmsPage({ title: "Domovská stránka", slug: "domov", status: "draft" });
    const published = seedCmsPage({
      title: "O nás",
      slug: "o-nas",
      status: "published",
      published_at: "2026-05-19T00:00:00.000Z",
    });
    await setupAdmin(context, page, { tables: { cms_pages: [draft, published] } });
    const index = new AdminPagesIndexPage(page);

    await test.step("Navigate to /admin/pages", async () => {
      await index.open();
    });

    await test.step("Verify both table rows are visible", async () => {
      await expect(index.listRow(draft.id)).toBeVisible();
      await expect(index.listRow(published.id)).toBeVisible();
    });

    await test.step('Verify the draft row status badge text is "Koncept"', async () => {
      await expect(index.listRow(draft.id)).toContainText("Koncept");
    });

    await test.step('Verify the published row status badge text is "Publikované"', async () => {
      await expect(index.listRow(published.id)).toContainText("Publikované");
    });
  });

  // TC-03: Click the edit link on a row navigates to the editor
  test("TC-03: clicking the edit link navigates to /admin/pages/$pageId", async ({
    context,
    page,
  }) => {
    const pg = seedCmsPage({ title: "Nav test", slug: "nav-test" });
    await setupAdmin(context, page, { tables: { cms_pages: [pg] } });
    const index = new AdminPagesIndexPage(page);

    await test.step("Navigate to /admin/pages", async () => {
      await index.open();
    });

    await test.step("Verify the seeded row is visible", async () => {
      await expect(index.listRow(pg.id)).toBeVisible();
    });

    await test.step("Click the edit icon link for the seeded row", async () => {
      await index.rowEditLink(pg.id).click();
    });

    await test.step("Verify the URL changes to /admin/pages/<id>", async () => {
      await expect(page).toHaveURL(new RegExp(`/admin/pages/${pg.id}`));
    });
  });
});

// ---------------------------------------------------------------------------
// Editor — /admin/pages/$pageId
// ---------------------------------------------------------------------------

test.describe("/admin/pages/$pageId — CMS page editor", () => {
  // TC-04: Editor renders metadata fields and action buttons for a seeded page
  test("TC-04: editor renders title input, slug input, description textarea, and save + publish buttons", async ({
    context,
    page,
  }) => {
    const pg = seedCmsPage({ title: "Testovacia stránka", slug: "testovacia-stranka" });
    await setupAdmin(context, page, { tables: { cms_pages: [pg] } });
    const editor = new AdminPagesEditorPage(page);

    await test.step("Navigate to /admin/pages/<id>", async () => {
      await editor.open(pg.id);
    });

    await test.step("Verify the editor root is visible", async () => {
      await expect(editor.root).toBeVisible();
    });

    await test.step("Verify the title input is visible and has the seeded title", async () => {
      await expect(editor.titleInput).toBeVisible();
      await expect(editor.titleInput).toHaveValue("Testovacia stránka");
    });

    await test.step("Verify the slug input is visible and has the seeded slug", async () => {
      await expect(editor.slugInput).toBeVisible();
      await expect(editor.slugInput).toHaveValue("testovacia-stranka");
    });

    await test.step("Verify the description textarea is visible", async () => {
      await expect(editor.descriptionInput).toBeVisible();
    });

    await test.step("Verify the save button is visible and enabled", async () => {
      await expect(editor.saveButton).toBeVisible();
      await expect(editor.saveButton).toBeEnabled();
    });

    await test.step("Verify the publish button is visible for a draft page", async () => {
      await expect(editor.publishButton).toBeVisible();
    });
  });

  // TC-05: Editing the title updates the input value and keeps save enabled
  test("TC-05: editing the title updates the input value and keeps save enabled", async ({
    context,
    page,
  }) => {
    const pg = seedCmsPage({ title: "Pôvodný názov", slug: "povodny-nazov" });
    await setupAdmin(context, page, { tables: { cms_pages: [pg] } });
    const editor = new AdminPagesEditorPage(page);

    await test.step("Navigate to /admin/pages/<id>", async () => {
      await editor.open(pg.id);
    });

    await test.step("Clear the title input and type a new title", async () => {
      await editor.titleInput.clear();
      await editor.titleInput.fill("Nový názov");
    });

    await test.step('Verify the title input value is "Nový názov"', async () => {
      await expect(editor.titleInput).toHaveValue("Nový názov");
    });

    await test.step("Verify the save button is enabled", async () => {
      await expect(editor.saveButton).toBeEnabled();
    });

    await test.step("Verify the title error message is hidden", async () => {
      await expect(editor.titleError).toBeHidden();
    });
  });

  // TC-06: Publish toggle changes the hidden status probe from "draft" to "published"
  test("TC-06: clicking publish changes the hidden status probe to 'published'", async ({
    context,
    page,
  }) => {
    const pg = seedCmsPage({ title: "Stránka na publikovanie", slug: "stranka-na-publikovanie" });
    await setupAdmin(context, page, { tables: { cms_pages: [pg] } });
    const editor = new AdminPagesEditorPage(page);

    await test.step("Navigate to /admin/pages/<id>", async () => {
      await editor.open(pg.id);
    });

    await test.step('Verify the hidden status probe initially reads "draft"', async () => {
      await expect(editor.statusProbe).toHaveText("draft");
    });

    await test.step("Click the publish button", async () => {
      await editor.publishButton.click();
    });

    await test.step('Verify the hidden status probe now reads "published"', async () => {
      await expect(editor.statusProbe).toHaveText("published");
    });

    await test.step("Verify the unpublish button is now visible", async () => {
      await expect(editor.unpublishButton).toBeVisible();
    });
  });

  // TC-07: Back link navigates to /admin/pages list
  test("TC-07: clicking the back link navigates to /admin/pages", async ({ context, page }) => {
    const pg = seedCmsPage({ title: "Stránka späť", slug: "stranka-spat" });
    await setupAdmin(context, page, { tables: { cms_pages: [pg] } });
    const editor = new AdminPagesEditorPage(page);

    await test.step("Navigate to /admin/pages/<id>", async () => {
      await editor.open(pg.id);
    });

    await test.step("Verify the editor root is visible", async () => {
      await expect(editor.root).toBeVisible();
    });

    await test.step("Click the back link", async () => {
      await editor.backLink.click();
    });

    await test.step("Verify the URL changes to /admin/pages", async () => {
      await expect(page).toHaveURL(/\/admin\/pages\/?$/);
    });
  });
});
