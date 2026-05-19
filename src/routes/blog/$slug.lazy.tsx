import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { BlogPostSources } from "@/components/blog/BlogPostSources";
import { BlogScenarioCard } from "@/components/blog/BlogScenarioCard";
import { tFor } from "@/i18n/blog";
import { useBlogPost } from "@/lib/blog/queries";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/blog-jsonld";

// Inline scenario embed for v1. Per locked decision #6 the article body
// includes a single BlogScenarioCard; selecting it per-article from the
// quiz bank moves to a `scenario_question_id` column on `blog_posts`
// in a later epic. Until then every article shows the same fallback.
const FALLBACK_SCENARIO_QUESTION_ID = "p-sms-posta-1";

export const Route = createLazyFileRoute("/blog/$slug")({
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = useParams({ from: "/blog/$slug" });
  const t = tFor("post");
  const query = useBlogPost(slug);

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

  const publishedDate = new Date(post.published_at).toLocaleDateString("sk-SK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="container mx-auto px-4 py-12" data-testid="blog-post-root">
      <Link
        to="/blog"
        className="text-sm underline text-muted-foreground"
        data-testid="blog-post-back-link"
      >
        ← {t("back_to_blog")}
      </Link>

      <header className="mt-8">
        <p className="text-sm text-muted-foreground" data-testid="blog-post-category">
          {t("in_category")}{" "}
          <Link
            to="/blog/kategoria/$slug"
            params={{ slug: post.category.slug }}
            className="underline hover:text-foreground"
            data-testid="blog-post-category-link"
          >
            {post.category.name}
          </Link>
        </p>
        <h1 className="mt-2 text-4xl font-bold" data-testid="blog-post-title">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="mt-4 text-xl text-muted-foreground" data-testid="blog-post-subtitle">
            {post.subtitle}
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground" data-testid="blog-post-meta">
          {t("author_prefix")}{" "}
          <Link
            to="/blog/autor/$slug"
            params={{ slug: post.author.slug }}
            className="underline hover:text-foreground"
            data-testid="blog-post-author-link"
          >
            {post.author.display_name}
          </Link>{" "}
          · {t("published_on", { date: publishedDate })}
          {post.reading_minutes != null && (
            <> · {t("reading_time", { minutes: String(post.reading_minutes) })}</>
          )}
        </p>
      </header>

      {post.hero_image_url && (
        <img
          src={post.hero_image_url}
          alt=""
          className="mt-8 w-full rounded-lg"
          data-testid="blog-post-hero-image"
        />
      )}

      <BlogPostBody mdx={post.body_mdx} />

      <BlogPostSources sources={post.sources} />

      <BlogScenarioCard questionId={FALLBACK_SCENARIO_QUESTION_ID} />

      {/* Client-side JSON-LD. Google's bot executes JS for indexing, so
          this is functional for Article + BreadcrumbList rich results.
          Server-side rendering via TanStack `head()` requires moving the
          post fetch into a route loader — planned refactor when Search
          Console flags rich-result coverage gaps. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(post)) }}
        data-testid="blog-post-jsonld-article"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(post)) }}
        data-testid="blog-post-jsonld-breadcrumb"
      />
    </main>
  );
}
