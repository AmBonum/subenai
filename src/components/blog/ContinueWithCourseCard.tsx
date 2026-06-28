import { Link } from "@tanstack/react-router";
import { ArrowRight, Zap } from "lucide-react";

import { COURSES } from "@/content/courses";

// E17.2 — article → course cross-link surface.
//
// Renders on /blog/<slug> when blog_posts.related_course_slug is set.
// Bridges the editorial "read about it" experience to the active
// "now practice it" surface — closes the test ↔ course ↔ article
// strategic gap identified in the 2026-05-19 user analysis.
//
// Lookup: course slug → in-memory COURSES registry (TS modules, not
// DB). Returns null if the slug doesn't resolve — editor typo or a
// course got removed without updating DB. Silent failure is correct;
// surfacing a broken link is worse than a missing link.

interface ContinueWithCourseCardProps {
  courseSlug: string | null;
}

export function ContinueWithCourseCard({ courseSlug }: ContinueWithCourseCardProps) {
  if (!courseSlug) return null;
  const course = COURSES.find((c) => c.slug === courseSlug);
  if (!course) return null;
  return (
    <aside
      className="mt-12 overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-br from-success/10 via-primary/5 to-transparent p-6 md:p-8"
      aria-labelledby="continue-with-course-heading"
      data-testid="blog-continue-with-course"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div>
          <p
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-success"
            data-testid="blog-continue-with-course-eyebrow"
          >
            <Zap className="size-3.5" aria-hidden="true" />
            chceš si to precvičiť?
          </p>
          <h3
            id="continue-with-course-heading"
            className="mt-2 text-xl font-bold md:text-2xl"
            data-testid="blog-continue-with-course-title"
          >
            {course.title}
          </h3>
          <p
            className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base"
            data-testid="blog-continue-with-course-tagline"
          >
            {course.tagline}
          </p>
          <p
            className="mt-2 text-xs text-muted-foreground"
            data-testid="blog-continue-with-course-meta"
          >
            interaktívne školenie · {course.estimatedMinutes} min · {course.difficulty}
          </p>
        </div>
        <Link
          to="/academy/$slug"
          params={{ slug: course.slug }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/60 bg-success/10 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-success/20"
          data-testid="blog-continue-with-course-cta"
        >
          otvor školenie
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
