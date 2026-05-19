import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { tFor } from "@/i18n/blog";
import { useBlogPost } from "@/lib/blog/queries";

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
          {t("in_category")} {post.category.name}
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
          {t("author_prefix")} {post.author.display_name} ·{" "}
          {t("published_on", { date: publishedDate })}
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

      {/* MDX rendering deferred to D2.B once the markdown package is wired.
          Placeholder renders body as preformatted text so the route compiles
          and reads sensibly during pre-launch QA. */}
      <article
        className="prose prose-lg mt-8 max-w-none whitespace-pre-wrap"
        data-testid="blog-post-body"
      >
        {post.body_mdx}
      </article>
    </main>
  );
}
