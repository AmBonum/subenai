import { createLazyFileRoute, Link } from "@tanstack/react-router";

import { tFor } from "@/i18n/blog";
import { useBlogPostList } from "@/lib/blog/queries";
import { buildBlogIndexJsonLd } from "@/lib/seo/blog-jsonld";

export const Route = createLazyFileRoute("/blog/")({
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const t = tFor("index");
  const query = useBlogPostList();

  return (
    <main className="container mx-auto px-4 py-12" data-testid="blog-index-root">
      <header className="mb-12">
        <h1 className="text-4xl font-bold" data-testid="blog-index-title">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground" data-testid="blog-index-description">
          {t("description")}
        </p>
      </header>

      {query.isLoading && <p data-testid="blog-index-loading">{t("loading")}</p>}

      {query.isError && (
        <p data-testid="blog-index-error" role="alert">
          {t("error")}
        </p>
      )}

      {query.data && query.data.length === 0 && (
        <p data-testid="blog-index-empty">{t("empty_state")}</p>
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

      {query.data && query.data.length > 0 && (
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" data-testid="blog-index-list">
          {query.data.map((post) => (
            <li key={post.id} data-testid={`blog-post-card-${post.slug}`}>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="block group"
                data-testid={`blog-post-card-link-${post.slug}`}
              >
                {post.hero_image_url && (
                  <img
                    src={post.hero_image_url}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full rounded-lg object-cover"
                    data-testid={`blog-post-card-image-${post.slug}`}
                  />
                )}
                <p
                  className="mt-3 text-xs uppercase tracking-wide text-muted-foreground"
                  data-testid={`blog-post-card-category-${post.slug}`}
                >
                  {post.category.name}
                </p>
                <h2
                  className="mt-2 text-xl font-semibold group-hover:underline"
                  data-testid={`blog-post-card-title-${post.slug}`}
                >
                  {post.title}
                </h2>
                <p
                  className="mt-2 text-sm text-muted-foreground"
                  data-testid={`blog-post-card-excerpt-${post.slug}`}
                >
                  {post.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
