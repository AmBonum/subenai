import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";

import { useBlogPostByRelatedCourse } from "@/lib/blog/queries";

// E17.3 — course → article reverse cross-link.
//
// Renders on /courses/<slug> when ANY blog post in the DB has
// related_course_slug = currentCourse.slug. Drives readers who
// finished the active-learning surface back to the editorial
// long-form content for deeper context (psychology, references,
// real-world cases).
//
// Reverse direction of ContinueWithCourseCard (article → course).
// Together they close the test ↔ course ↔ article triangle: a reader
// can enter from any surface and discover the other two without
// having to know our IA structure ahead of time.
//
// Visual: primary-tinted accent (vs. the success-green of the
// article→course direction) so direction-aware viewers can tell
// at a glance whether they're heading INTO active training or OUT
// of it into reading.

interface RelatedAcademyArticleCardProps {
  courseSlug: string;
}

export function RelatedAcademyArticleCard({ courseSlug }: RelatedAcademyArticleCardProps) {
  const query = useBlogPostByRelatedCourse(courseSlug);
  const post = query.data;
  if (!post) return null;
  return (
    <aside
      className="mt-12 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 md:p-8"
      aria-labelledby="course-related-academy-heading"
      data-testid="course-related-academy"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div>
          <p
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary"
            data-testid="course-related-academy-eyebrow"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            chceš tomu rozumieť do hĺbky?
          </p>
          <h3
            id="course-related-academy-heading"
            className="mt-2 text-xl font-bold md:text-2xl"
            data-testid="course-related-academy-title"
          >
            {post.title}
          </h3>
          <p
            className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base"
            data-testid="course-related-academy-excerpt"
          >
            {post.excerpt}
          </p>
          <p
            className="mt-2 text-xs text-muted-foreground"
            data-testid="course-related-academy-meta"
          >
            sprievodca v akadémii · {post.category.name}
            {post.reading_minutes != null && <> · {post.reading_minutes} min čítania</>}
          </p>
        </div>
        <Link
          to="/academy/$slug"
          params={{ slug: post.slug }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/60 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
          data-testid="course-related-academy-cta"
        >
          otvor sprievodcu
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
