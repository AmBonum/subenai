import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { CourseDetail } from "../../poms/courses/CourseDetail";

/**
 * E36 — /courses/$slug detail: breadcrumb (Phase C). The hero / title
 * / tagline surface is covered by the legacy POM in
 * `e2e/poms/quiz/CoursesPage.ts`; this spec only verifies the
 * breadcrumb additions.
 */
test.describe("Course detail — E36 breadcrumb", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  test("renders the breadcrumb with Domov → Školenia → course title", async ({ page }) => {
    const detail = new CourseDetail(page);
    await detail.open("sms-smishing");
    await expect(detail.root).toBeVisible();
    await expect(detail.breadcrumb).toBeVisible();

    // 0 = Domov, must be a link to /
    const home = detail.breadcrumbItem(0);
    await expect(home).toHaveText("Domov");
    await expect(home).toHaveAttribute("href", "/");

    // 1 = Školenia, must be a link to /courses
    const courses = detail.breadcrumbItem(1);
    await expect(courses).toHaveText("Školenia");
    await expect(courses).toHaveAttribute("href", "/courses");

    // 2 = course title — span with aria-current=page, NOT a link
    const current = detail.breadcrumbItem(2);
    await expect(current).toHaveText("Ako nedať sa nachytať na podvodné SMS");
    await expect(current).toHaveAttribute("aria-current", "page");
  });
});
