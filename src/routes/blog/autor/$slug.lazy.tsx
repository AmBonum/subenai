import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { tFor } from "@/i18n/blog";
import { trackBlogAuthorView } from "@/lib/analytics/blog-events";
import { useBlogAuthorBySlug, useBlogPostsByAuthorId } from "@/lib/blog/queries";
import { formatPublishedArticleCount } from "@/lib/blog/slovak-plurals";

export const Route = createLazyFileRoute("/blog/autor/$slug")({
  component: BlogAuthorPage,
});

function BlogAuthorPage() {
  const { slug } = useParams({ from: "/blog/autor/$slug" });
  const t = tFor("author");
  const authorQuery = useBlogAuthorBySlug(slug);
  const postsQuery = useBlogPostsByAuthorId(authorQuery.data?.id);

  useEffect(() => {
    if (!authorQuery.data || !postsQuery.data) return;
    trackBlogAuthorView({
      author_slug: authorQuery.data.slug,
      post_count: postsQuery.data.length,
    });
  }, [authorQuery.data?.id, postsQuery.data?.length, authorQuery.data, postsQuery.data]);

  if (authorQuery.isLoading) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-author-loading">
        <p className="text-muted-foreground">{t("loading")}</p>
      </main>
    );
  }

  if (authorQuery.isError) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-author-error">
        <p role="alert">{t("error")}</p>
      </main>
    );
  }

  const author = authorQuery.data;
  if (!author) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-author-not-found-root">
        <h1 className="text-3xl font-bold" data-testid="blog-author-not-found-title">
          {t("not_found_title")}
        </h1>
        <p className="mt-4 text-muted-foreground" data-testid="blog-author-not-found-description">
          {t("not_found_description")}
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-block underline"
          data-testid="blog-author-not-found-back"
        >
          {t("back_to_blog")}
        </Link>
      </main>
    );
  }

  const posts = postsQuery.data ?? [];
  // Initials for the avatar fallback when no avatar_url is set
  // (subenai editorial currently has none — fallback shows "se").
  const initials = author.display_name
    .split(/\s+/u)
    .slice(0, 2)
    .map((w) => w.charAt(0).toLowerCase())
    .join("");

  return (
    <main className="container mx-auto px-4 py-8 md:py-12" data-testid="blog-author-root">
      <nav aria-label="breadcrumb" data-testid="blog-author-breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link
              to="/blog"
              className="hover:text-foreground"
              data-testid="blog-author-breadcrumb-blog"
            >
              blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground" data-testid="blog-author-breadcrumb-current">
            {author.display_name}
          </li>
        </ol>
      </nav>

      {/* Author hero — avatar (or initials gradient fallback) + name +
          bio + post count. Centered to match the pillar article
          editorial header so navigation across article ↔ author feels
          coherent. */}
      <header
        className="mx-auto mt-10 flex max-w-3xl flex-col items-center text-center"
        data-testid="blog-author-header"
      >
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt=""
            className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/20"
            data-testid="blog-author-avatar"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-bold uppercase text-primary-foreground ring-2 ring-primary/20"
            aria-hidden="true"
            data-testid="blog-author-avatar-fallback"
          >
            {initials}
          </div>
        )}
        <p
          className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          data-testid="blog-author-eyebrow"
        >
          autor
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight md:text-5xl"
          data-testid="blog-author-title"
        >
          {author.display_name}
        </h1>
        {author.bio && (
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground" data-testid="blog-author-bio">
            {author.bio}
          </p>
        )}
        {posts.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground" data-testid="blog-author-post-count">
            {formatPublishedArticleCount(posts.length)}
          </p>
        )}
      </header>

      <section className="mt-12 border-t border-border pt-10">
        <h2
          className="text-2xl font-bold tracking-tight md:text-3xl"
          data-testid="blog-author-section-heading"
        >
          {t("by_author")} {author.display_name}
        </h2>

        {postsQuery.isLoading && (
          <p
            className="mt-8 text-center text-muted-foreground"
            data-testid="blog-author-posts-loading"
          >
            {t("loading")}
          </p>
        )}

        {!postsQuery.isLoading && posts.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground" data-testid="blog-author-empty">
            {t("empty")}
          </p>
        )}

        {posts.length > 0 && (
          <ul
            className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            data-testid="blog-author-list"
          >
            {posts.map((post) => (
              <li key={post.id} data-testid={`blog-author-post-card-${post.slug}`}>
                <BlogPostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
