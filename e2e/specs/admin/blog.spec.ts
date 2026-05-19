import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedBlogCategory, seedBlogAuthor, seedBlogPost } from "../../seed";
import {
  AdminBlogListPage,
  AdminBlogNewPage,
  AdminBlogEditPage,
} from "../../poms/admin/AdminBlogPage";

const EMPTY_BLOG_TABLES = {
  blog_posts: [],
  blog_categories: [],
  blog_authors: [],
};

test.describe("/admin/blog — list", () => {
  // TC-01: Empty state when no posts seeded
  test("TC-01: empty state renders when no posts are seeded", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: EMPTY_BLOG_TABLES });
    const list = new AdminBlogListPage(page);

    await test.step("Navigate to /admin/blog", async () => {
      await list.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(list.root).toBeVisible();
    });

    await test.step("Verify the empty-state paragraph is visible with expected text", async () => {
      await expect(list.emptyState).toBeVisible();
      await expect(list.emptyState).toHaveText(
        'Zatiaľ žiadne články. Vytvor prvý cez tlačidlo „Nový článok".',
      );
    });

    await test.step('Verify the "Nový článok" button is visible', async () => {
      await expect(list.newButton).toBeVisible();
    });
  });

  // TC-02: Populated list — post rows render
  test("TC-02: populated list renders a row for each seeded post", async ({ context, page }) => {
    const category = seedBlogCategory({ id: "bcat_001", slug: "ai", name: "AI" });
    const author = seedBlogAuthor({ id: "baut_001", slug: "jana", display_name: "Jana" });
    const post = seedBlogPost(category, author, {
      id: "bpst_001",
      slug: "test-artikel",
      title: "Test Artikel",
      status: "draft",
    });
    await setupAdmin(context, page, {
      tables: {
        blog_posts: [post],
        blog_categories: [category],
        blog_authors: [author],
      },
    });
    const list = new AdminBlogListPage(page);

    await test.step("Navigate to /admin/blog", async () => {
      await list.open();
    });

    await test.step("Verify the table root is visible", async () => {
      await expect(list.tableRoot).toBeVisible();
    });

    await test.step("Verify the row for 'test-artikel' is visible", async () => {
      await expect(list.listRow("test-artikel")).toBeVisible();
    });

    await test.step("Verify the row link displays 'Test Artikel'", async () => {
      await expect(list.listRowLink("test-artikel")).toHaveText("Test Artikel");
    });

    await test.step("Verify the result count shows 1 article", async () => {
      await expect(list.resultCount).toHaveText("Zobrazených 1 článkov");
    });
  });
});

test.describe("/admin/blog/new", () => {
  // TC-03: Renders the create form
  test("TC-03: renders the create form with empty title and slug inputs", async ({
    context,
    page,
  }) => {
    const category = seedBlogCategory({ id: "cat-1", slug: "ai", name: "AI" });
    const author = seedBlogAuthor({ id: "aut-1", slug: "jana", display_name: "Jana" });
    await setupAdmin(context, page, {
      tables: {
        blog_posts: [],
        blog_categories: [category],
        blog_authors: [author],
      },
    });
    const newPage = new AdminBlogNewPage(page);

    await test.step("Navigate to /admin/blog/new", async () => {
      await newPage.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(newPage.root).toBeVisible();
    });

    await test.step('Verify the page-header title reads "Nový článok"', async () => {
      await expect(newPage.pageHeaderTitle).toHaveText("Nový článok");
    });

    await test.step("Verify the editor root is visible", async () => {
      await expect(newPage.editorRoot).toBeVisible();
    });

    await test.step("Verify the title input is visible and empty", async () => {
      await expect(newPage.titleInput).toBeVisible();
      await expect(newPage.titleInput).toHaveValue("");
    });

    await test.step("Verify the slug input is visible and empty", async () => {
      await expect(newPage.slugInput).toBeVisible();
      await expect(newPage.slugInput).toHaveValue("");
    });

    await test.step('Verify the "Vytvoriť" save button is visible', async () => {
      await expect(newPage.saveButton).toBeVisible();
      await expect(newPage.saveButton).toHaveText("Vytvoriť");
    });
  });
});

test.describe("/admin/blog/$id", () => {
  // TC-04: Renders for a seeded post — title + body visible
  test("TC-04: renders the edit form for a seeded published post", async ({ context, page }) => {
    const category = seedBlogCategory({ id: "bcat_001", slug: "ai", name: "AI" });
    const author = seedBlogAuthor({ id: "baut_001", slug: "jana", display_name: "Jana" });
    const post = seedBlogPost(category, author, {
      id: "post-1",
      slug: "zivy-artikel",
      title: "Živý článok",
      status: "published",
      published_at: "2026-05-01T00:00:00.000Z",
    });
    await setupAdmin(context, page, {
      tables: {
        blog_posts: [post],
        blog_categories: [category],
        blog_authors: [author],
      },
    });
    const editPage = new AdminBlogEditPage(page);

    await test.step("Navigate to /admin/blog/post-1", async () => {
      await editPage.openPost("post-1");
    });

    await test.step("Verify the edit page root is visible", async () => {
      await expect(editPage.root).toBeVisible();
    });

    await test.step('Verify the page-header title reads "Živý článok"', async () => {
      await expect(editPage.pageHeaderTitle).toHaveText("Živý článok");
    });

    await test.step("Verify the editor root is visible", async () => {
      await expect(editPage.editorRoot).toBeVisible();
    });

    await test.step('Verify the title input has value "Živý článok"', async () => {
      await expect(editPage.titleInput).toHaveValue("Živý článok");
    });

    await test.step('Verify the status label contains "publikované"', async () => {
      await expect(editPage.statusLabel).toContainText("publikované");
    });
  });
});

test.describe("/admin/blog — CTA navigation", () => {
  // TC-05: "Nový článok" CTA navigates to /admin/blog/new
  test('TC-05: "Nový článok" CTA navigates to /admin/blog/new', async ({ context, page }) => {
    await setupAdmin(context, page, { tables: EMPTY_BLOG_TABLES });
    const list = new AdminBlogListPage(page);

    await test.step("Navigate to /admin/blog and verify empty state", async () => {
      await list.open();
      await expect(list.emptyState).toBeVisible();
    });

    await test.step('Click the "Nový článok" button', async () => {
      await list.newButton.click();
    });

    await test.step("Verify the URL changes to /admin/blog/new", async () => {
      await expect(page).toHaveURL(/\/admin\/blog\/new$/);
    });
  });
});
