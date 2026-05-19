import { Link } from "@tanstack/react-router";
import type { Course } from "@/content/courses";
import { tFor } from "@/i18n/quiz";

export function CourseCard({ course }: { course: Course }) {
  const t = tFor("courses_misc");
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="group block rounded-2xl border border-border/60 bg-card/70 p-5 transition hover:border-primary/50 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-4xl" aria-hidden="true">
          {course.heroEmoji}
        </span>
        <span className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs text-muted-foreground">
          {t(`category_label.${course.category}`)}
        </span>
      </div>
      <h3 className="text-lg font-bold text-foreground group-hover:text-primary">{course.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{course.tagline}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        ⏱ {course.estimatedMinutes} min · {course.difficulty}
      </p>
    </Link>
  );
}
