import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * POM for /courses/$slug detail extensions added by E36 — primarily
 * the breadcrumb wired by Phase C. Existing detail surface (hero,
 * title, tagline) is covered by `e2e/poms/quiz/CoursesPage.ts`.
 */
export class CourseDetail extends BasePage {
  static path(slug: string) {
    return `/courses/${slug}` as const;
  }

  open(slug: string) {
    return this.goto(CourseDetail.path(slug));
  }

  get root(): Locator {
    return this.page.getByTestId("course-detail-root");
  }

  get breadcrumb(): Locator {
    return this.page.getByTestId("course-detail-breadcrumb");
  }

  // Indexed crumb getter: 0 = "Domov", 1 = "Školenia", 2 = course title.
  breadcrumbItem(idx: number): Locator {
    return this.page.getByTestId(`course-detail-breadcrumb-${idx}`);
  }
}
