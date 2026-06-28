import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";

import { useBlogPostByRelatedTest } from "@/lib/blog/queries";

// E25 Phase 3 — test pack → article reverse cross-link.
//
// Renders on /tests/<slug> when ANY blog post has
// related_test_slug = currentPack.slug. Mirror of
// RelatedAcademyArticleCard (which serves /courses/<slug>): same
// visual treatment, same query shape, just keyed off a different
// column.
//
// Together with RelatedAcademyArticleCard and ContinueWithCourseCard
// this closes the test ↔ course ↔ article triangle — a reader can
// enter from any of the three surfaces and discover the other two
// without having to know our IA structure.

interface RelatedTestPackArticleCardProps {
  packSlug: string;
}

export function RelatedTestPackArticleCard({ packSlug }: RelatedTestPackArticleCardProps) {
  const query = useBlogPostByRelatedTest(packSlug);
  const post = query.data;
  if (!post) return null;
  return (
    <aside
      className="mt-12 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 md:p-8"
      aria-labelledby="test-pack-related-academy-heading"
      data-testid="test-pack-related-academy"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div>
          <p
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary"
            data-testid="test-pack-related-academy-eyebrow"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            chceš tomu rozumieť do hĺbky?
          </p>
          <h3
            id="test-pack-related-academy-heading"
            className="mt-2 text-xl font-bold md:text-2xl"
            data-testid="test-pack-related-academy-title"
          >
            {post.title}
          </h3>
          <p
            className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base"
            data-testid="test-pack-related-academy-excerpt"
          >
            {post.excerpt}
          </p>
          <p
            className="mt-2 text-xs text-muted-foreground"
            data-testid="test-pack-related-academy-meta"
          >
            sprievodca v akadémii · {post.category.name}
            {post.reading_minutes != null && <> · {post.reading_minutes} min čítania</>}
          </p>
        </div>
        <Link
          to="/academy/$slug"
          params={{ slug: post.slug }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/60 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
          data-testid="test-pack-related-academy-cta"
        >
          otvor sprievodcu
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
