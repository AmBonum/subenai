import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { tFor } from "@/i18n/blog";
import { isPillarSlug } from "@/lib/blog/pillar-slugs";
import { useBlogPostList } from "@/lib/blog/queries";
import { buildBlogIndexJsonLd } from "@/lib/seo/blog-jsonld";

export const Route = createLazyFileRoute("/blog/")({
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const t = tFor("index");
  const query = useBlogPostList();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Split into pillars + clusters once; the filter chip then narrows
  // the "clusters" list. Pillars stay visible on the hero row even when
  // a category filter is active (they're the editorial anchors —
  // surfacing them top-level keeps the IA legible). Memo on the
  // referentially stable query.data to avoid re-running on every render.
  const posts = useMemo(() => query.data ?? [], [query.data]);
  const pillars = useMemo(() => posts.filter((p) => isPillarSlug(p.slug)), [posts]);
  const clusters = useMemo(() => posts.filter((p) => !isPillarSlug(p.slug)), [posts]);

  // Category aggregates derived from the raw list so counts match
  // what's actually rendered.
  const categoryOptions = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of posts) {
      const existing = map.get(p.category.slug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(p.category.slug, { slug: p.category.slug, name: p.category.name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [posts]);

  const filteredClusters = useMemo(() => {
    if (!activeCategory) return clusters;
    return clusters.filter((p) => p.category.slug === activeCategory);
  }, [clusters, activeCategory]);

  return (
    <main className="container mx-auto px-4 py-12" data-testid="blog-index-root">
      {/* Hero — title + supporting copy + scam-of-the-week feel */}
      <header className="mx-auto max-w-4xl text-center" data-testid="blog-index-hero">
        <p
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
          data-testid="blog-index-eyebrow"
        >
          <span aria-hidden="true">🛡</span> subenai blog
        </p>
        <h1
          className="mt-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          data-testid="blog-index-title"
        >
          {t("title")}
        </h1>
        <p
          className="mt-6 text-lg text-muted-foreground md:text-xl"
          data-testid="blog-index-description"
        >
          {t("description")}
        </p>
      </header>

      {query.isLoading && (
        <p className="mt-12 text-center text-muted-foreground" data-testid="blog-index-loading">
          {t("loading")}
        </p>
      )}

      {query.isError && (
        <p className="mt-12 text-center" data-testid="blog-index-error" role="alert">
          {t("error")}
        </p>
      )}

      {query.data && query.data.length === 0 && (
        <p className="mt-12 text-center text-muted-foreground" data-testid="blog-index-empty">
          {t("empty_state")}
        </p>
      )}

      {query.data && query.data.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildBlogIndexJsonLd(query.data)),
          }}
          data-testid="blog-index-jsonld"
        />
      )}

      {/* Featured pillars — top-of-page editorial anchors */}
      {pillars.length > 0 && (
        <section
          className="mt-16 border-t border-border pt-12"
          data-testid="blog-index-pillars-section"
        >
          <div className="flex items-end justify-between gap-4">
            <h2
              className="text-2xl font-bold tracking-tight md:text-3xl"
              data-testid="blog-index-pillars-heading"
            >
              {t("pillar_heading")}
            </h2>
            <p
              className="hidden text-sm text-muted-foreground md:block"
              data-testid="blog-index-pillars-subheading"
            >
              {pillars.length} hĺbkových sprievodcov
            </p>
          </div>
          <ul
            className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            data-testid="blog-index-pillars-list"
          >
            {pillars.map((post) => (
              <li key={post.id} data-testid={`blog-pillar-card-${post.slug}`}>
                <BlogPostCard post={post} variant="featured" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cluster grid with category filter */}
      {clusters.length > 0 && (
        <section
          className="mt-16 border-t border-border pt-12"
          data-testid="blog-index-clusters-section"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2
                className="text-2xl font-bold tracking-tight md:text-3xl"
                data-testid="blog-index-clusters-heading"
              >
                {t("latest_heading")}
              </h2>
              <p
                className="mt-2 text-sm text-muted-foreground"
                data-testid="blog-index-clusters-subheading"
              >
                {t("category_heading")}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CategoryFilter
              options={categoryOptions}
              activeSlug={activeCategory}
              onChange={setActiveCategory}
              totalCount={clusters.length}
            />
          </div>
          {filteredClusters.length === 0 ? (
            <p
              className="mt-12 text-center text-muted-foreground"
              data-testid="blog-index-clusters-empty"
            >
              v tejto kategórii zatiaľ nie sú články.
            </p>
          ) : (
            <ul
              className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              data-testid="blog-index-list"
            >
              {filteredClusters.map((post) => (
                <li key={post.id} data-testid={`blog-post-card-${post.slug}`}>
                  <BlogPostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
