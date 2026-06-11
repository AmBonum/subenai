import { test, expect } from "../../fixtures/base";
import { seedBlogAuthor, seedBlogCategory, seedBlogPost } from "../../seed";
import { BlogPostPage } from "../../poms/blog/BlogPostPage";
import { setupPublicBlog } from "./public-blog-setup";

// Source plan: specs/blog/public-blog.md (TC-04..TC-06).
//
// Runtime caveat (same as the per-route SEO specs): under `npm run dev`
// the route `head()` (canonical, robots) applies client-side after
// hydration; on production CF Pages it ships in the SSR HTML. The
// DocumentHead POM observes the DOM either way.

test.describe("/blog/$slug — public article detail", () => {
  // TC-04: Published article renders title, markdown body, date, canonical
  test("TC-04: published article renders h1, markdown body, date and canonical link", async ({
    context,
    page,
    docHead,
  }) => {
    const category = seedBlogCategory({ slug: "phishing", name: "Phishing" });
    const author = seedBlogAuthor({ slug: "jana", display_name: "Jana" });
    const post = seedBlogPost(category, author, {
      slug: "ako-funguje-phishing-utok",
      title: "Ako funguje phishingový útok",
      excerpt: "Anatómia phishingového útoku krok za krokom.",
      status: "published",
      published_at: "2026-05-10T08:00:00.000Z",
      reading_minutes: 7,
      body_mdx:
        "Phishing je podvodná technika, ktorá zneužíva dôveru.\n\n" +
        "## Ako útok prebieha\n\n" +
        "Útočník pošle e-mail s falošným odkazom na prihlasovaciu stránku.",
    });
    await setupPublicBlog(context, page, [post]);
    const article = new BlogPostPage(page);

    await test.step("Navigate directly to the article URL", async () => {
      await article.openSlug(post.slug);
      await expect(article.root).toBeVisible();
    });

    await test.step("Verify the h1 shows the seeded title", async () => {
      await expect(article.title).toHaveText("Ako funguje phishingový útok");
    });

    await test.step("Verify the markdown body renders the intro paragraph", async () => {
      await expect(article.body).toBeVisible();
      await expect(
        article.bodyText("Phishing je podvodná technika, ktorá zneužíva dôveru."),
      ).toBeVisible();
    });

    await test.step("Verify the markdown H2 renders as a heading element", async () => {
      await expect(article.bodyHeading("Ako útok prebieha")).toBeVisible();
    });

    await test.step("Verify the published date is visible with the seeded ISO datetime", async () => {
      await expect(article.publishedMeta).toContainText("publikované");
      await expect(article.publishedTime).toHaveAttribute("dateTime", "2026-05-10T08:00:00.000Z");
      await expect(article.publishedTime).toContainText("2026");
    });

    await test.step("Verify the canonical link points at the article URL", async () => {
      await expect(docHead.canonicalLink).toHaveAttribute(
        "href",
        `https://subenai.sk/blog/${post.slug}`,
      );
    });
  });

  // TC-05: Unknown slug → SPA not-found UI + noindex robots meta
  test("TC-05: unknown slug renders the Slovak not-found UI with noindex robots meta", async ({
    context,
    page,
    docHead,
  }) => {
    const category = seedBlogCategory({ slug: "phishing", name: "Phishing" });
    const author = seedBlogAuthor({ slug: "jana", display_name: "Jana" });
    const other = seedBlogPost(category, author, {
      slug: "existujuci-clanok",
      title: "Existujúci článok",
      status: "published",
      published_at: "2026-05-10T08:00:00.000Z",
    });
    await setupPublicBlog(context, page, [other]);
    const article = new BlogPostPage(page);

    await test.step("Navigate to a slug that does not exist", async () => {
      await article.openSlug("neexistujuci-clanok");
      await expect(article.notFoundRoot).toBeVisible();
    });

    await test.step("Verify the verbatim Slovak not-found copy", async () => {
      await expect(article.notFoundTitle).toHaveText("tento článok neexistuje");
      await expect(article.notFoundDescription).toHaveText(
        "možno bol presunutý alebo zmazaný. skús sa pozrieť na zoznam článkov.",
      );
    });

    await test.step("Verify the back link points to /blog", async () => {
      await expect(article.notFoundBackLink).toHaveText("späť na blog");
      await expect(article.notFoundBackLink).toHaveAttribute("href", "/blog");
    });

    await test.step("Verify the robots meta is noindex, nofollow", async () => {
      await expect(docHead.robotsMeta).toHaveAttribute("content", "noindex, nofollow");
    });
  });

  // TC-06: Raw <script> in markdown body renders inert, never executes
  test("TC-06: raw <script> in markdown is neutralised — no execution, no script tag", async ({
    context,
    page,
  }) => {
    const category = seedBlogCategory({ slug: "phishing", name: "Phishing" });
    const author = seedBlogAuthor({ slug: "jana", display_name: "Jana" });
    const post = seedBlogPost(category, author, {
      slug: "clanok-so-skriptom",
      title: "Článok so skriptom",
      excerpt: "Bezpečnostný test markdown rendera.",
      status: "published",
      published_at: "2026-05-10T08:00:00.000Z",
      body_mdx:
        "Tento odsek je bezpečný.\n\n" +
        "<script>alert(1)</script>\n\n" +
        "## Nadpis sekcie\n\n" +
        "Ďalší bezpečný odsek.",
    });
    await setupPublicBlog(context, page, [post]);
    const article = new BlogPostPage(page);

    let dialogFired = false;
    page.on("dialog", (dialog) => {
      dialogFired = true;
      void dialog.dismiss();
    });

    await test.step("Open the article", async () => {
      await article.openSlug(post.slug);
      await expect(article.body).toBeVisible();
    });

    await test.step("Verify the surrounding markdown still renders", async () => {
      await expect(article.bodyText("Tento odsek je bezpečný.")).toBeVisible();
      await expect(article.bodyHeading("Nadpis sekcie")).toBeVisible();
    });

    await test.step("Verify no <script> element exists inside the article body", async () => {
      await expect(article.bodyScripts).toHaveCount(0);
    });

    await test.step("Verify the payload was not injected anywhere in the document", async () => {
      await expect(article.injectedScript("alert(1)")).toHaveCount(0);
    });

    await test.step("Verify no browser dialog fired", async () => {
      expect(dialogFired).toBe(false);
    });
  });
});
