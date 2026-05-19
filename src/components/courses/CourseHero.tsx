import { Clock, BarChart3, Tag } from "lucide-react";

import type { Course } from "@/content/courses";
import { tFor } from "@/i18n/quiz";
import { CourseHeroFallback } from "./CourseHeroFallback";

// E28 — course detail hero aligned with the catalog visual language.
// Before: flat text-7xl emoji on white bg + dense meta text line.
// After: category-gradient hero zone (reuses CourseHeroFallback's
// "featured" variant — same component that powers the catalog cards,
// just in banner aspect 16/7) + pill-style chip meta with Lucide icons.
//
// Catalog card → detail page used to be a visual discontinuity; both
// now use the same hero primitive and the same chip language.
export function CourseHero({ course }: { course: Course }) {
  const t = tFor("courses_misc");
  return (
    <header data-testid="course-detail-hero" className="mb-10">
      <CourseHeroFallback
        category={course.category}
        emoji={course.heroEmoji}
        title={course.title}
        variant="featured"
        testid="course-detail-hero-visual"
      />
      <div className="mt-6 text-center">
        <h1 data-testid="course-detail-title" className="text-4xl font-black sm:text-5xl">
          {course.title}
        </h1>
        <p
          data-testid="course-detail-tagline"
          className="mt-3 text-base text-muted-foreground sm:text-lg"
        >
          {course.tagline}
        </p>
        <ul
          data-testid="course-detail-meta"
          className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs"
          aria-label={t("reading_aria")}
        >
          <li
            data-testid="course-detail-meta-time"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-foreground"
          >
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {course.estimatedMinutes} min
          </li>
          <li
            data-testid="course-detail-meta-difficulty"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-foreground"
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {course.difficulty}
          </li>
          <li
            data-testid="course-detail-meta-category"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-foreground"
          >
            <Tag className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t(`category_label.${course.category}`)}
          </li>
        </ul>
      </div>
    </header>
  );
}
