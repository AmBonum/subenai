import type { Course } from "@/content/courses";
import { tFor } from "@/i18n/quiz";

export function CourseHero({ course }: { course: Course }) {
  const t = tFor("courses_misc");
  return (
    <header className="mb-10 text-center">
      <div className="text-7xl">{course.heroEmoji}</div>
      <h1 className="mt-4 text-4xl font-black sm:text-5xl">{course.title}</h1>
      <p className="mt-3 text-base text-muted-foreground sm:text-lg">{course.tagline}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        <span aria-label={t("reading_aria")}>⏱ {course.estimatedMinutes} min</span>
        {" · "}
        <span>{course.difficulty}</span>
        {" · "}
        <span>{t(`category_label.${course.category}`)}</span>
      </p>
    </header>
  );
}
