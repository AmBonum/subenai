import { Link } from "@tanstack/react-router";

import { trackBlogCtaClick } from "@/lib/analytics/blog-events";

interface ArticleCTABannerProps {
  // Optional context for the GA4 cta-click event. Caller (article
  // page) passes the slug + category so the funnel report can attribute
  // conversions to the originating piece. Falls back to "" if absent
  // (unit tests / preview screens).
  postSlug?: string;
  categorySlug?: string;
}

// Inline conversion CTA pointing readers at the /tests entry point.
// Renders mid-article (after BlogPostBody) so it isn't intrusive but
// catches engaged readers. Stays a single component so the copy /
// styling lives in one place across all 80+ articles.
export function ArticleCTABanner({ postSlug, categorySlug }: ArticleCTABannerProps = {}) {
  return (
    <aside
      className="mt-12 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-6 md:p-8"
      data-testid="blog-article-cta"
      aria-label="pozvánka na test internetovej bezpečnosti"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest text-primary"
            data-testid="blog-article-cta-eyebrow"
          >
            otestuj sa
          </p>
          <h3 className="mt-2 text-xl font-bold md:text-2xl" data-testid="blog-article-cta-title">
            rozoznáš podvod skôr, než ťa dostane?
          </h3>
          <p
            className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base"
            data-testid="blog-article-cta-description"
          >
            spravíš si krátky test — 10 reálnych scenárov, 3 minúty. dozvieš sa, kde máš slabé
            miesto a čo si v praxi precvičiť.
          </p>
        </div>
        <Link
          to="/tests"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          data-testid="blog-article-cta-button"
          onClick={() =>
            trackBlogCtaClick({
              post_slug: postSlug ?? "",
              category_slug: categorySlug ?? "",
              destination: "/tests",
              position: "inline_banner",
            })
          }
        >
          spravím si test →
        </Link>
      </div>
    </aside>
  );
}
