import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { SITE_ORIGIN } from "@/config/site";
import { ArticleCTABanner } from "@/components/blog/ArticleCTABanner";
import { BlogHeroFallback } from "@/components/blog/BlogHeroFallback";
import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { BlogPostSources } from "@/components/blog/BlogPostSources";
import { BlogScenarioCard } from "@/components/blog/BlogScenarioCard";
import { BlogShareRow } from "@/components/blog/BlogShareRow";
import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { CategoryBadge } from "@/components/blog/CategoryBadge";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { RelatedArticles } from "@/components/blog/RelatedArticles";
import { tFor } from "@/i18n/blog";
import { isPillarSlug } from "@/lib/blog/pillar-slugs";
import { useBlogPost, useBlogPostList } from "@/lib/blog/queries";

// Inline scenario embed for v1. Per locked decision #6 the article body
// includes a single BlogScenarioCard; selecting it per-article from the
// quiz bank moves to a `scenario_question_id` column on `blog_posts`
// in a later epic. Until then every article shows the same fallback.
const FALLBACK_SCENARIO_QUESTION_ID = "p-sms-posta-1";

// How many related articles to surface at the bottom. We pull from the
// same category first, then top up from the global list if fewer are
// available — keeps the section consistent even for thinly-populated
// categories.
const RELATED_LIMIT = 3;

export const Route = createLazyFileRoute("/blog/$slug")({
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = useParams({ from: "/blog/$slug" });
  const t = tFor("post");
  const query = useBlogPost(slug);
  // List is already cached by the index page in most navigation paths;
  // when arriving direct, this fires a single request that's cheap
  // (< 100 rows, < 5 KB).
  const listQuery = useBlogPostList();

  const related = useMemo(() => {
    if (!query.data || !listQuery.data) return [];
    const sameCategory = listQuery.data.filter(
      (p) => p.slug !== query.data.slug && p.category.slug === query.data.category.slug,
    );
    const otherTopics = listQuery.data.filter(
      (p) => p.slug !== query.data.slug && p.category.slug !== query.data.category.slug,
    );
    return [...sameCategory, ...otherTopics].slice(0, RELATED_LIMIT);
  }, [query.data, listQuery.data]);

  if (query.isLoading) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-post-loading">
        <p>{t("loading")}</p>
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-post-error">
        <p role="alert">{t("error")}</p>
      </main>
    );
  }

  const post = query.data;
  if (!post) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-post-not-found-root">
        <h1 className="text-3xl font-bold" data-testid="blog-post-not-found-title">
          {t("not_found_title")}
        </h1>
        <p className="mt-4 text-muted-foreground" data-testid="blog-post-not-found-description">
          {t("not_found_description")}
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-block underline"
          data-testid="blog-post-not-found-back"
        >
          {t("not_found_back")}
        </Link>
      </main>
    );
  }

  const pillar = isPillarSlug(post.slug);
  const publishedDate = new Date(post.published_at).toLocaleDateString("sk-SK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <ReadingProgress />
      <main className="container mx-auto px-4 py-8 md:py-12" data-testid="blog-post-root">
        <nav aria-label="breadcrumb" data-testid="blog-post-breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                to="/blog"
                className="hover:text-foreground"
                data-testid="blog-post-breadcrumb-blog"
              >
                blog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                to="/blog/kategoria/$slug"
                params={{ slug: post.category.slug }}
                className="hover:text-foreground"
                data-testid="blog-post-breadcrumb-category"
              >
                {post.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="line-clamp-1 text-foreground" data-testid="blog-post-breadcrumb-current">
              {post.title}
            </li>
          </ol>
        </nav>

        <header className="mx-auto mt-8 max-w-4xl text-center" data-testid="blog-post-header">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CategoryBadge
              slug={post.category.slug}
              name={post.category.name}
              variant="link"
              size="md"
              testid="blog-post-category-badge"
            />
            {pillar && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground"
                data-testid="blog-post-pillar-badge"
              >
                <span aria-hidden="true">★</span> sprievodca
              </span>
            )}
          </div>
          <h1
            className="mt-6 text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl"
            data-testid="blog-post-title"
          >
            {post.title}
          </h1>
          {post.subtitle && (
            <p
              className="mt-4 text-lg text-muted-foreground md:text-xl"
              data-testid="blog-post-subtitle"
            >
              {post.subtitle}
            </p>
          )}
          <p
            className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground"
            data-testid="blog-post-meta"
          >
            <span>
              {t("author_prefix")}{" "}
              <Link
                to="/blog/autor/$slug"
                params={{ slug: post.author.slug }}
                className="font-medium text-foreground underline-offset-4 hover:underline"
                data-testid="blog-post-author-link"
              >
                {post.author.display_name}
              </Link>
            </span>
            <span aria-hidden="true">·</span>
            <span>{t("published_on", { date: publishedDate })}</span>
            {post.reading_minutes != null && (
              <>
                <span aria-hidden="true">·</span>
                <span data-testid="blog-post-reading-time">
                  {t("reading_time", { minutes: String(post.reading_minutes) })}
                </span>
              </>
            )}
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-5xl">
          {post.hero_image_url ? (
            <img
              src={post.hero_image_url}
              alt=""
              className="aspect-[21/9] w-full rounded-2xl object-cover md:aspect-[3/1]"
              data-testid="blog-post-hero-image"
            />
          ) : (
            <BlogHeroFallback
              categorySlug={post.category.slug}
              title={post.title}
              variant="banner"
              testid="blog-post-hero-fallback"
            />
          )}
        </div>

        {/* Article body + sticky TOC sidebar (xl+ only). On smaller
            screens TOC is hidden — readers scroll the article
            sequentially and the BlogTableOfContents component returns
            null when fewer than 3 headings exist. */}
        <div className="mx-auto mt-12 grid max-w-6xl gap-12 xl:grid-cols-[1fr_220px]">
          <div className="min-w-0">
            <BlogPostBody mdx={post.body_mdx} />
            <div className="mx-auto max-w-3xl">
              <BlogPostSources sources={post.sources} />
              <BlogShareRow url={`${SITE_ORIGIN}/blog/${post.slug}`} title={post.title} />
              <ArticleCTABanner />
              <BlogScenarioCard questionId={FALLBACK_SCENARIO_QUESTION_ID} />
            </div>
          </div>
          <aside className="hidden xl:block">
            <BlogTableOfContents mdx={post.body_mdx} label="obsah" />
          </aside>
        </div>

        <div className="mx-auto max-w-6xl">
          <RelatedArticles posts={related} heading={t("related_heading")} />
        </div>

        {/* JSON-LD (Article + BreadcrumbList) is emitted server-side via
            the route's head() in src/routes/blog/$slug.tsx — the inline
            <script> tags that used to live here were removed in the
            E16.3 Phase 2 SSR refactor. */}
      </main>
    </>
  );
}
