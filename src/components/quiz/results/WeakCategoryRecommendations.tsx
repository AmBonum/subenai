import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";

import { COURSES } from "@/content/courses";
import { useBlogPost } from "@/lib/blog/queries";
import {
  CATEGORY_RECOMMENDATIONS,
  getWeakCategories,
  type QuizCategory,
} from "@/lib/quiz/category-recommendations";
import type { ScoreResult } from "@/lib/quiz/score/scoring";
import { tFor } from "@/i18n/quiz";

// E17.4 — quiz result → course + article recommendations.
//
// Closes the test ↔ course ↔ article triangle on the third surface:
//   - blog → course (E17.2 ContinueWithCourseCard)
//   - course → article (E17.3 RelatedAcademyArticleCard)
//   - test → course + article (this component)
//
// Mounted on the ResultsView right after the breakdown card. Filters
// the breakdown to "weak" categories (< 50 %) and surfaces ONE course
// + ONE article per weak category, using the hardcoded
// CATEGORY_RECOMMENDATIONS map.
//
// If a user aces every category (none below threshold), the whole
// section is omitted — no patronising "you're awesome, here's content
// anyway" block. Save the recommendation real estate for users who
// actually need it.

interface Props {
  breakdown: ScoreResult["breakdown"];
}

export function WeakCategoryRecommendations({ breakdown }: Props) {
  const t = tFor("results");
  const weak = getWeakCategories(breakdown);
  if (weak.length === 0) return null;

  return (
    <section
      className="mt-6 animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-card"
      aria-labelledby="weak-recs-heading"
      data-testid="results-weak-recs"
    >
      <h3
        id="weak-recs-heading"
        className="text-base font-bold"
        data-testid="results-weak-recs-title"
      >
        {t("weak_recs_title")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground" data-testid="results-weak-recs-body">
        {t("weak_recs_body")}
      </p>

      <div className="mt-5 space-y-5">
        {weak.map((category) => (
          <WeakCategoryRow key={category} category={category} score={breakdown[category]} />
        ))}
      </div>
    </section>
  );
}

function WeakCategoryRow({ category, score }: { category: QuizCategory; score: number }) {
  const t = tFor("results");
  const rec = CATEGORY_RECOMMENDATIONS[category];
  const course = COURSES.find((c) => c.slug === rec.courseSlug) ?? null;
  // Pillar lookup is async — degrade gracefully while loading or if the
  // post doesn't exist yet (we don't gate the course recommendation on
  // the article being published).
  const pillarQuery = useBlogPost(rec.pillarSlug);
  const pillar = pillarQuery.data;

  // Defensive: if both halves resolve to nothing (course slug typo
  // somehow survived the registry check + article missing), skip the
  // row entirely. Should never happen in practice.
  if (!course && !pillar) return null;

  return (
    <div
      className="rounded-xl border border-border/60 bg-background/50 p-4"
      data-testid={`results-weak-recs-row-${category}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-sm font-semibold text-foreground"
          data-testid={`results-weak-recs-category-${category}`}
        >
          {t(`categories.${category}`)}
        </p>
        <span
          className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-mono font-semibold tabular-nums text-destructive"
          data-testid={`results-weak-recs-score-${category}`}
        >
          {score} %
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {course && (
          <Link
            to="/courses/$slug"
            params={{ slug: course.slug }}
            className="group flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-3 transition-colors hover:border-success/60 hover:bg-success/10"
            data-testid={`results-weak-recs-course-${category}`}
          >
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-xs font-bold uppercase tracking-widest text-success">
                {t("weak_recs_course_eyebrow")}
              </span>
              <span className="mt-1 block text-sm font-semibold text-foreground">
                {course.title}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {course.estimatedMinutes} min · {course.difficulty}
              </span>
            </span>
            <ArrowRight
              className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        )}

        {pillar && (
          <Link
            to="/blog/$slug"
            params={{ slug: pillar.slug }}
            className="group flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 transition-colors hover:border-primary/60 hover:bg-primary/10"
            data-testid={`results-weak-recs-article-${category}`}
          >
            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-xs font-bold uppercase tracking-widest text-primary">
                {t("weak_recs_article_eyebrow")}
              </span>
              <span className="mt-1 block text-sm font-semibold text-foreground">
                {pillar.title}
              </span>
              {pillar.reading_minutes != null && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {pillar.reading_minutes} min čítania
                </span>
              )}
            </span>
            <ArrowRight
              className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
    </div>
  );
}
