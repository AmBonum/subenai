import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { CoursesCatalogPage, CourseDetailPage } from "../../poms/quiz/CoursesPage";

/**
 * Anon courses surface. No Supabase mocks needed — the catalog and
 * detail pages read from the static `COURSES` bundle. The 404 path
 * is exercised via TanStack's `notFound()` thrown from the route
 * loader, caught by the root route, rendering the global 404 layout.
 */

test.describe("Courses catalog — /courses", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  test("TC-01: catalog renders with heading, search input, and at least 4 course cards", async ({
    page,
  }) => {
    const catalog = new CoursesCatalogPage(page);
    await catalog.open();
    await expect(catalog.root).toBeVisible();
    await expect(catalog.heading).toBeVisible();
    await expect(catalog.searchInput).toBeVisible();
    await expect(catalog.grid).toBeVisible();
    const cardCount = await catalog.allCards().count();
    expect(cardCount).toBeGreaterThanOrEqual(4);
  });

  test("TC-02: search narrows the grid to matching titles", async ({ page }) => {
    const catalog = new CoursesCatalogPage(page);
    await catalog.open();
    const baseline = await catalog.allCards().count();
    // `deepfake` matches at least one course title verbatim (e.g.
    // `ai-deepfake-podvody`).
    await catalog.searchInput.fill("deepfake");
    // Allow the filtered re-render to commit before counting.
    await expect(catalog.grid).toBeVisible();
    const filtered = await catalog.allCards().count();
    expect(filtered).toBeLessThan(baseline);
    expect(filtered).toBeGreaterThan(0);
  });

  test("TC-03: search query with no match shows empty state", async ({ page }) => {
    const catalog = new CoursesCatalogPage(page);
    await catalog.open();
    await catalog.searchInput.fill("xxxx-nonsense-zzzz");
    await expect(catalog.emptyState).toBeVisible();
    await expect(catalog.grid).toHaveCount(0);
  });
});

test.describe("Course detail — /courses/$slug", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  test("TC-04: valid slug renders detail root + hero + title + tagline", async ({ page }) => {
    const detail = new CourseDetailPage(page);
    // `data-hygiene` is a stable Slovak bundle slug (see
    // src/content/courses/data-hygiene.ts).
    await detail.open("data-hygiene");
    await expect(detail.root).toBeVisible();
    await expect(detail.hero).toBeVisible();
    await expect(detail.title).toBeVisible();
    await expect(detail.tagline).toBeVisible();
  });

  test("TC-05: invalid slug renders the global 404 layout", async ({ page, notFound }) => {
    const detail = new CourseDetailPage(page);
    await detail.open("no-such-course-9999");
    // The route loader throws `notFound()`; root route renders the
    // global 404 UI. The actual page has "Stránka nenájdená" as h1
    // (no literal "404" heading — that's a paragraph above), so the
    // subheading getter is the reliable assertion target.
    await expect(notFound.subheading).toBeVisible();
    await expect(detail.root).toHaveCount(0);
  });
});
