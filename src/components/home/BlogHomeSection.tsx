import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { trackBlogIndexView } from "@/lib/analytics/blog-events";
import { isPillarSlug } from "@/lib/blog/pillar-slugs";
import { useBlogPostList } from "@/lib/blog/queries";

// E16.6 — homepage "Akadémia" section.
//
// Lives on / above the FAQ so a brand-new visitor sees:
//   1. the value-prop hero,
//   2. the test/skolenia features,
//   3. THE EDUCATIONAL CONTENT (this section), then
//   4. the FAQ.
//
// Senior-UX rationale: most marketing sites surface their content
// engine on the homepage to anchor authority + drive deep-link traffic.
// Stripe Press, Vercel Resources, Notion Blog all do this. The home
// page is the highest-priority surface for a Google-indexed brand
// page; piping editorial content into it strengthens the
// authoritative signal for `internetové podvody` / `phishing slovensko`
// long-tail queries (the homepage often ranks higher than per-article
// pages for these head terms).
//
// Surfaces 3 pillar articles + a primary CTA. Cluster articles stay
// behind the /blog index — the homepage is editorial, the index is
// catalogue.
//
// Gracefully renders nothing if the query is in-flight or returns
// zero pillars (e.g. early CI / preview before content is seeded).

export function BlogHomeSection() {
  const query = useBlogPostList();
  const featuredPillars = useMemo(() => {
    const all = query.data ?? [];
    return all.filter((p) => isPillarSlug(p.slug)).slice(0, 3);
  }, [query.data]);

  if (featuredPillars.length === 0) return null;

  return (
    <section
      className="mt-24"
      aria-labelledby="homepage-blog-heading"
      data-testid="home-blog-section"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
            data-testid="home-blog-eyebrow"
          >
            <span aria-hidden="true">🎓</span> akadémia subenai
          </p>
          <h2
            id="homepage-blog-heading"
            className="mt-4 text-2xl font-bold tracking-tight md:text-3xl"
            data-testid="home-blog-heading"
          >
            učíme sa rozpoznávať podvody — krok po kroku
          </h2>
          <p
            className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base"
            data-testid="home-blog-description"
          >
            hĺbkové sprievodcovia, krátke návody a reálne príbehy. všetko bezplatne, v slovenčine,
            bez paywallu.
          </p>
        </div>
        <Link
          to="/blog"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10"
          data-testid="home-blog-cta-secondary"
        >
          pozri všetky články
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="home-blog-cards">
        {featuredPillars.map((post) => (
          <li
            key={post.id}
            data-testid={`home-blog-card-${post.slug}`}
            // Track which featured pillar is the conversion driver from
            // the homepage. Re-uses the existing blog_index_view event
            // for now (clicking still navigates to the article which
            // emits blog_post_view); a dedicated home_card_click event
            // is overkill at v1 — pivot in GA4 via `page_path:'/'`.
            onClick={() => trackBlogIndexView()}
          >
            <BlogPostCard post={post} variant="featured" />
          </li>
        ))}
      </ul>

      {/* Primary CTA below the cards — full-width on mobile for tap-friendliness */}
      <div className="mt-8 flex justify-center md:hidden">
        <Link
          to="/blog"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          data-testid="home-blog-cta-primary"
        >
          pozri všetky články
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
