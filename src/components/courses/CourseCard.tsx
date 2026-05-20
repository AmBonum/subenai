import { Link } from "@tanstack/react-router";
import { BookOpen, Clock } from "lucide-react";

import type { Course } from "@/content/courses";
import type { BlogPostListItem } from "@/lib/blog/queries";
import { tFor } from "@/i18n/quiz";
import { CourseHeroFallback } from "./CourseHeroFallback";

interface CourseCardProps {
  course: Course;
  /** Optional related blog post (from useBlogPostsByRelatedCourses
   *  batched query, fed by the catalog parent). When present, renders
   *  a compact "Čítaj k tomu:" slot under the meta line linking to
   *  the blog post. When null/undefined, the slot is omitted. */
  relatedArticle?: BlogPostListItem | null;
}

// E25 Phase 2 — CourseCard revamp.
//
// Before: emoji + category chip on a flat card. Visually indistinguishable
// from a list-item row, no signal of category, no visual hook.
// After: two-zone card matching TestPackCard + BlogPostCard. Course-
// category gradient hero zone with the course's heroEmoji centered on
// top, title + tagline + meta + optional related-article slot below.
//
// The relatedArticle prop is fed by the catalog parent via a single
// batched supabase query (useBlogPostsByRelatedCourses) instead of N
// per-card subscriptions — matters at ~18 courses.
//
// Wrapper is now a <div> (was <Link>) so we can place the related-
// article link inside the card without nesting interactive elements
// (browsers strip nested <a>). The hero zone + the title both link
// to the course detail; the related-article slot links to the blog.
export function CourseCard({ course, relatedArticle }: CourseCardProps) {
  const tCourses = tFor("courses_misc");
  const tSkolenia = tFor("skolenia");
  return (
    <div
      data-testid={`courses-card-${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 transition hover:border-primary/50 hover:bg-card focus-within:ring-2 focus-within:ring-primary"
    >
      <Link
        to="/courses/$slug"
        params={{ slug: course.slug }}
        className="block focus:outline-none"
        aria-label={course.title}
      >
        <CourseHeroFallback
          category={course.category}
          emoji={course.heroEmoji}
          title={course.title}
          testid={`courses-card-hero-${course.slug}`}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              data-testid={`courses-card-category-${course.slug}`}
              className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tCourses(`category_label.${course.category}`)}
            </span>
            <span
              data-testid={`courses-card-difficulty-${course.slug}`}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                course.difficulty === "začiatočník"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {course.difficulty}
            </span>
          </div>
        </div>
        <Link
          to="/courses/$slug"
          params={{ slug: course.slug }}
          className="focus:outline-none"
          data-testid={`courses-card-title-link-${course.slug}`}
        >
          <h3
            data-testid={`courses-card-title-${course.slug}`}
            className="text-lg font-bold text-foreground group-hover:text-primary"
          >
            {course.title}
          </h3>
        </Link>
        <p className="line-clamp-3 text-sm text-muted-foreground">{course.tagline}</p>
        <p
          data-testid={`courses-card-minutes-${course.slug}`}
          className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
        >
          <Clock className="h-3 w-3" aria-hidden="true" />
          {course.estimatedMinutes} min
        </p>
        {relatedArticle && (
          <Link
            to="/blog/$slug"
            params={{ slug: relatedArticle.slug }}
            data-testid={`courses-card-related-article-${course.slug}`}
            className="mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs transition hover:bg-primary/10"
          >
            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="font-semibold text-primary">
                {tSkolenia("related_article_label")}
              </span>
              <span
                className="line-clamp-2 text-muted-foreground"
                data-testid={`courses-card-related-article-title-${course.slug}`}
              >
                {relatedArticle.title}
              </span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
