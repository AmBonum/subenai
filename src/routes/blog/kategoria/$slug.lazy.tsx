import { createLazyFileRoute, Link, useParams } from "@tanstack/react-router";

import { tFor } from "@/i18n/blog";
import { useBlogCategoryBySlug, useBlogPostsByCategoryId } from "@/lib/blog/queries";

export const Route = createLazyFileRoute("/blog/kategoria/$slug")({
  component: BlogCategoryPage,
});

function BlogCategoryPage() {
  const { slug } = useParams({ from: "/blog/kategoria/$slug" });
  const t = tFor("category");
  const categoryQuery = useBlogCategoryBySlug(slug);
  const postsQuery = useBlogPostsByCategoryId(categoryQuery.data?.id);

  if (categoryQuery.isLoading) {
    return (
      <main className="container mx-auto px-4 py-12" data-testid="blog-category-loading">
        <p>{t("loading")}</p>
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
    <main className="container mx-auto px-4 py-12" data-testid="blog-category-root">
      <Link
        to="/blog"
        className="text-sm underline text-muted-foreground"
        data-testid="blog-category-back-link"
      >
        ← {t("back_to_blog")}
      </Link>

      <header className="mt-8 mb-12">
        <h1 className="text-4xl font-bold" data-testid="blog-category-title">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-4 text-lg text-muted-foreground" data-testid="blog-category-description">
            {category.description}
          </p>
        )}
      </header>

      {postsQuery.isLoading && <p data-testid="blog-category-posts-loading">{t("loading")}</p>}

      {!postsQuery.isLoading && posts.length === 0 && (
        <p data-testid="blog-category-empty">{t("empty")}</p>
      )}

      {posts.length > 0 && (
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-category-list">
          {posts.map((post) => (
            <li key={post.id} data-testid={`blog-category-post-card-${post.slug}`}>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="block group"
                data-testid={`blog-category-post-card-link-${post.slug}`}
              >
                {post.hero_image_url && (
                  <img
                    src={post.hero_image_url}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <h2 className="mt-4 text-xl font-semibold group-hover:underline">{post.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
