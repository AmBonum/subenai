import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import { BlogHeroFallback } from "@/components/blog/BlogHeroFallback";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { CategoryBadge } from "@/components/blog/CategoryBadge";
import { tFor } from "@/i18n/blog";
import { trackBlogCategoryView } from "@/lib/analytics/blog-events";
import { useBlogCategoryBySlug, useBlogPostsByCategoryId } from "@/lib/blog/queries";
import { formatArticleCount } from "@/lib/blog/slovak-plurals";

export const Route = createLazyFileRoute("/blog/kategoria/$slug")({
  component: BlogCategoryPage,
});

function BlogCategoryPage() {
  const { slug } = useParams({ from: "/blog/kategoria/$slug" });
  const t = tFor("category");
  const categoryQuery = useBlogCategoryBySlug(slug);
  const postsQuery = useBlogPostsByCategoryId(categoryQuery.data?.id);

  // Fire once when both the category and its posts have resolved — we
  // want the post_count in GA4 for funnel pivots, so waiting for both
  // is correct (firing twice on category-only would skew the metric).
  useEffect(() => {
    if (!categoryQuery.data || !postsQuery.data) return;
    trackBlogCategoryView({
      category_slug: categoryQuery.data.slug,
      post_count: postsQuery.data.length,
    });
  }, [categoryQuery.data?.id, postsQuery.data?.length, categoryQuery.data, postsQuery.data]);

  if (categoryQuery.isLoading) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-category-loading">
        <p className="text-muted-foreground">{t("loading")}</p>
      </main>
    );
  }

  if (categoryQuery.isError) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-category-error">
        <p role="alert">{t("error")}</p>
      </main>
    );
  }

  const category = categoryQuery.data;
  if (!category) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-category-not-found-root">
        <h1 className="text-3xl font-bold" data-testid="blog-category-not-found-title">
          {t("not_found_title")}
        </h1>
        <p className="mt-4 text-muted-foreground" data-testid="blog-category-not-found-description">
          {t("not_found_description")}
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-block underline"
          data-testid="blog-category-not-found-back"
        >
          {t("back_to_blog")}
        </Link>
      </main>
    );
  }

  const posts = postsQuery.data ?? [];

  return (
    <main className="container mx-auto px-4 py-8 md:py-12" data-testid="blog-category-root">
      <nav aria-label="breadcrumb" data-testid="blog-category-breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link
              to="/blog"
              className="hover:text-foreground"
              data-testid="blog-category-breadcrumb-blog"
            >
              blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground" data-testid="blog-category-breadcrumb-current">
            {category.name}
          </li>
        </ol>
      </nav>

      {/* Category hero — banner with the category gradient + illustration
          on the left, name + description + post-count on the right.
          Reuses BlogHeroFallback in 'banner' variant for the same
          look-and-feel as a pillar article page. */}
      <header className="mt-8" data-testid="blog-category-header">
        <div className="grid gap-6 md:grid-cols-[2fr_3fr] md:items-center md:gap-10">
          <div className="relative">
            <BlogHeroFallback
              categorySlug={category.slug}
              title={category.name}
              variant="card"
              testid="blog-category-hero-fallback"
            />
          </div>
          <div>
            <CategoryBadge
              slug={category.slug}
              name={category.name}
              variant="static"
              size="md"
              testid="blog-category-badge"
            />
            <h1
              className="mt-4 text-3xl font-bold tracking-tight md:text-5xl"
              data-testid="blog-category-title"
            >
              {category.name}
            </h1>
            {category.description && (
              <p
                className="mt-4 text-lg text-muted-foreground"
                data-testid="blog-category-description"
              >
                {category.description}
              </p>
            )}
            {posts.length > 0 && (
              <p
                className="mt-4 text-sm text-muted-foreground"
                data-testid="blog-category-post-count"
              >
                {formatArticleCount(posts.length)} {t("all_articles").toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="mt-12 border-t border-border pt-10">
        {postsQuery.isLoading && (
          <p
            className="text-center text-muted-foreground"
            data-testid="blog-category-posts-loading"
          >
            {t("loading")}
          </p>
        )}

        {!postsQuery.isLoading && posts.length === 0 && (
          <p className="text-center text-muted-foreground" data-testid="blog-category-empty">
            {t("empty")}
          </p>
        )}

        {posts.length > 0 && (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-category-list">
            {posts.map((post) => (
              <li key={post.id} data-testid={`blog-category-post-card-${post.slug}`}>
                <BlogPostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
