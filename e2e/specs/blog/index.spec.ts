import { test, expect } from "../../fixtures/base";
import { seedBlogAuthor, seedBlogCategory, seedBlogPost } from "../../seed";
import { BlogIndexPage } from "../../poms/blog/BlogIndexPage";
import { setupPublicBlog } from "./public-blog-setup";

// Source plan: specs/blog/public-blog.md (TC-01..TC-03).
//
// Seeded slugs are deliberately NOT in PILLAR_SLUGS
// (src/lib/blog/pillar-slugs.ts) so every post lands in the cluster
// grid (`blog-index-list`), not the featured pillars row.

test.describe("/blog — public index", () => {
  // TC-01: Published posts render as cards; draft + scheduled stay hidden
  test("TC-01: published posts render as cards; draft and scheduled posts are hidden", async ({
    context,
    page,
  }) => {
    const category = seedBlogCategory({ slug: "phishing", name: "Phishing" });
    const author = seedBlogAuthor({ slug: "jana", display_name: "Jana" });
    const published = seedBlogPost(category, author, {
      slug: "ako-spoznat-phishing",
      title: "Ako spoznať phishing",
      excerpt: "Návod, ako odhaliť podvodný e-mail skôr, než klikneš.",
      status: "published",
      published_at: "2026-05-10T08:00:00.000Z",
      reading_minutes: 6,
    });
    const draft = seedBlogPost(category, author, {
      slug: "rozpisany-clanok",
      title: "Rozpísaný článok",
      status: "draft",
      published_at: null,
    });
    const scheduled = seedBlogPost(category, author, {
      slug: "naplanovany-clanok",
      title: "Naplánovaný článok",
      status: "published",
      published_at: "2030-01-01T00:00:00.000Z",
    });
    await setupPublicBlog(context, page, [published, draft, scheduled]);
    const blog = new BlogIndexPage(page);

    await test.step("Navigate to /blog", async () => {
      await blog.open();
      await expect(blog.root).toBeVisible();
    });

    await test.step("Verify the published post's card shows title, excerpt and date", async () => {
      await expect(blog.card(published.slug)).toBeVisible();
      await expect(blog.cardTitle(published.slug)).toHaveText("Ako spoznať phishing");
      await expect(blog.cardExcerpt(published.slug)).toHaveText(
        "Návod, ako odhaliť podvodný e-mail skôr, než klikneš.",
      );
      await expect(blog.cardDate(published.slug)).toContainText("2026");
    });

    await test.step("Verify the draft post's card is NOT rendered", async () => {
      await expect(blog.card(draft.slug)).toHaveCount(0);
    });

    await test.step("Verify the future-scheduled post's card is NOT rendered", async () => {
      await expect(blog.card(scheduled.slug)).toHaveCount(0);
    });
  });

  // TC-02: Category chip filters the cluster grid client-side (?cat= in URL)
  test("TC-02: clicking a category chip filters the grid and writes ?cat= to the URL", async ({
    context,
    page,
  }) => {
    const phishing = seedBlogCategory({ slug: "phishing", name: "Phishing" });
    const eshopy = seedBlogCategory({ slug: "eshopy", name: "Falošné e-shopy" });
    const author = seedBlogAuthor({ slug: "jana", display_name: "Jana" });
    const phishingA = seedBlogPost(phishing, author, {
      slug: "phishing-clanok-a",
      title: "Phishing článok A",
      excerpt: "Prvý phishing článok.",
      status: "published",
      published_at: "2026-05-12T08:00:00.000Z",
    });
    const phishingB = seedBlogPost(phishing, author, {
      slug: "phishing-clanok-b",
      title: "Phishing článok B",
      excerpt: "Druhý phishing článok.",
      status: "published",
      published_at: "2026-05-11T08:00:00.000Z",
    });
    const eshopPost = seedBlogPost(eshopy, author, {
      slug: "falosny-eshop-clanok",
      title: "Falošný e-shop článok",
      excerpt: "Článok o falošných e-shopoch.",
      status: "published",
      published_at: "2026-05-10T08:00:00.000Z",
    });
    await setupPublicBlog(context, page, [phishingA, phishingB, eshopPost]);
    const blog = new BlogIndexPage(page);

    await test.step("Navigate to /blog and verify all three cards render", async () => {
      await blog.open();
      await expect(blog.card(phishingA.slug)).toBeVisible();
      await expect(blog.card(phishingB.slug)).toBeVisible();
      await expect(blog.card(eshopPost.slug)).toBeVisible();
    });

    await test.step("Click the 'Falošné e-shopy' category chip", async () => {
      await blog.categoryChip("eshopy").click();
    });

    await test.step("Verify the chip is pressed and the URL carries ?cat=eshopy", async () => {
      await expect(blog.categoryChip("eshopy")).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/\/blog\?cat=eshopy$/);
    });

    await test.step("Verify only the e-shop card remains in the grid", async () => {
      await expect(blog.card(eshopPost.slug)).toBeVisible();
      await expect(blog.card(phishingA.slug)).toHaveCount(0);
      await expect(blog.card(phishingB.slug)).toHaveCount(0);
    });

    await test.step("Click the 'všetko' chip and verify all cards return", async () => {
      await blog.categoryChipAll.click();
      await expect(blog.card(phishingA.slug)).toBeVisible();
      await expect(blog.card(phishingB.slug)).toBeVisible();
      await expect(blog.card(eshopPost.slug)).toBeVisible();
    });
  });

  // TC-03: Empty state when zero published posts exist
  test("TC-03: zero published posts renders the Slovak empty-state copy", async ({
    context,
    page,
  }) => {
    await setupPublicBlog(context, page, []);
    const blog = new BlogIndexPage(page);

    await test.step("Navigate to /blog", async () => {
      await blog.open();
      await expect(blog.root).toBeVisible();
    });

    await test.step("Verify the verbatim Slovak empty-state copy", async () => {
      await expect(blog.emptyState).toBeVisible();
      await expect(blog.emptyState).toHaveText(
        "zatiaľ tu nič nie je. čoskoro pridáme prvé články.",
      );
    });

    await test.step("Verify the scope bar (search + chips) is not rendered", async () => {
      await expect(blog.scopeBar).toHaveCount(0);
    });
  });
});
