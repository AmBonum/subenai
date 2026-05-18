import { COURSES, type Course } from "@/content/courses";
import { CourseCard } from "./CourseCard";
import { tFor } from "@/i18n/quiz";

/**
 * Show up to 3 other published courses (excluding self). Prefer courses
 * in the same category; fill with the most recent ones if a category
 * has fewer than 3 siblings.
 */
export function RelatedCourses({ current }: { current: Course }) {
  const t = tFor("courses_misc");
  const others = COURSES.filter((c) => c.slug !== current.slug);
  const sameCategory = others.filter((c) => c.category === current.category);
  const fillers = others.filter((c) => c.category !== current.category);
  const picks = [...sameCategory, ...fillers].slice(0, 3);

  if (picks.length === 0) return null;

  return (
    <section
      aria-labelledby="related-h"
      className="mt-12 border-t border-border/60 pt-8 print:hidden"
    >
      <h2 id="related-h" className="text-lg font-bold text-foreground">
        {t("related_title")}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((c) => (
          <CourseCard key={c.slug} course={c} />
        ))}
      </div>
    </section>
  );
}
