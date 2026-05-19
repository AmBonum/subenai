import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";

import { useFeaturedBlogPostsForTests } from "@/lib/blog/queries";
import { tFor } from "@/i18n/quiz";

// E25 Phase 3 — "Učenie pred testom" strip on /tests index.
//
// Pulls the N (default 4) most-recent published articles whose
// `related_test_slug` is non-NULL — i.e. articles editorially tagged
// as study material for a test. Strip is conditionally rendered: when
// no articles are tagged yet (the state right after migration apply,
// before backfill), the entire section is omitted from the DOM so
// the catalog doesn't ship empty placeholders.
//
// Closes the test ↔ article direction of the cross-link triangle.
// blog→course was already wired (ContinueWithCourseCard), course→blog
// landed in Phase 2 (RelatedAcademyArticleCard wired on /courses
// index). This is the symmetric blog↔test pair.

export function TestsLearningStrip() {
  const t = tFor("testy");
  const query = useFeaturedBlogPostsForTests(4);
  const posts = query.data ?? [];
  // Graceful degradation: before any article is backfilled the strip
  // simply doesn't render. Once editorial tags a few articles with
  // related_test_slug, the strip lights up automatically.
  if (posts.length === 0) return null;
  return (
    <section
      data-testid="tests-learning-strip"
      aria-labelledby="tests-learning-strip-heading"
      className="mt-16 rounded-2xl border border-border/60 bg-card/30 p-6 md:p-8"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="tests-learning-strip-heading"
            data-testid="tests-learning-strip-heading"
            className="inline-flex items-center gap-2 text-2xl font-bold"
          >
            <BookOpen className="size-5 text-primary" aria-hidden="true" />
            {t("learning_strip_heading")}
          </h2>
          <p
            className="mt-1 max-w-2xl text-sm text-muted-foreground"
            data-testid="tests-learning-strip-subheading"
          >
            {t("learning_strip_subheading")}
          </p>
        </div>
        <Link
          to="/blog"
          data-testid="tests-learning-strip-cta"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("learning_strip_cta")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              to="/blog/$slug"
              params={{ slug: post.slug }}
              data-testid={`tests-learning-strip-item-${post.slug}`}
              className="group flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 p-3 transition hover:border-primary/40 hover:bg-card/60"
            >
              <span
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-primary"
                data-testid={`tests-learning-strip-item-category-${post.slug}`}
              >
                {post.category.name}
              </span>
              <span className="flex flex-1 flex-col">
                <span
                  className="text-sm font-semibold text-foreground group-hover:text-primary"
                  data-testid={`tests-learning-strip-item-title-${post.slug}`}
                >
                  {post.title}
                </span>
                {post.reading_minutes != null && (
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    {post.reading_minutes} min čítania
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
