import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { tFor } from "@/i18n/blog";
import { useBlogAuthorBySlug, useBlogPostsByAuthorId } from "@/lib/blog/queries";

export const Route = createLazyFileRoute("/blog/autor/$slug")({
  component: BlogAuthorPage,
});

function BlogAuthorPage() {
  const { slug } = useParams({ from: "/blog/autor/$slug" });
  const t = tFor("author");
  const authorQuery = useBlogAuthorBySlug(slug);
  const postsQuery = useBlogPostsByAuthorId(authorQuery.data?.id);

  if (authorQuery.isLoading) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-author-loading">
        <p>{t("loading")}</p>
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

  return (
    <main className="container mx-auto px-4 py-12" data-testid="blog-author-root">
      <Link
        to="/blog"
        className="text-sm underline text-muted-foreground"
        data-testid="blog-author-back-link"
      >
        ← {t("back_to_blog")}
      </Link>

      <header className="mt-8 mb-12 flex items-center gap-6">
        {author.avatar_url && (
          <img
            src={author.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
            data-testid="blog-author-avatar"
          />
        )}
        <div>
          <h1 className="text-4xl font-bold" data-testid="blog-author-title">
            {author.display_name}
          </h1>
          {author.bio && (
            <p className="mt-2 text-lg text-muted-foreground" data-testid="blog-author-bio">
              {author.bio}
            </p>
          )}
        </div>
      </header>

      <h2 className="text-2xl font-semibold mb-6" data-testid="blog-author-section-heading">
        {t("by_author")} {author.display_name}
      </h2>

      {postsQuery.isLoading && <p data-testid="blog-author-posts-loading">{t("loading")}</p>}

      {!postsQuery.isLoading && posts.length === 0 && (
        <p data-testid="blog-author-empty">{t("empty")}</p>
      )}

      {posts.length > 0 && (
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-author-list">
          {posts.map((post) => (
            <li key={post.id} data-testid={`blog-author-post-card-${post.slug}`}>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="block group"
                data-testid={`blog-author-post-card-link-${post.slug}`}
              >
                {post.hero_image_url && (
                  <img
                    src={post.hero_image_url}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {post.category.name}
                </p>
                <h3 className="mt-2 text-xl font-semibold group-hover:underline">{post.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
