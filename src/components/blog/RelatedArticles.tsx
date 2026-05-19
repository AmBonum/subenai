import type { BlogPostListItem } from "@/lib/blog/queries";

import { BlogPostCard } from "./BlogPostCard";

interface RelatedArticlesProps {
  posts: BlogPostListItem[];
  heading: string;
}

// Renders a 1–3 column grid of related-article cards. Caller is
// responsible for selecting + ordering posts (typically: 3 from the
// same category as the current article, excluding self).
export function RelatedArticles({ posts, heading }: RelatedArticlesProps) {
  if (posts.length === 0) return null;
  return (
    <section className="mt-16 border-t border-border pt-12" data-testid="blog-related-articles">
      <h2 className="text-2xl font-bold md:text-3xl" data-testid="blog-related-articles-heading">
        {heading}
      </h2>
      <ul
        className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        data-testid="blog-related-articles-list"
      >
        {posts.map((post) => (
          <li key={post.id} data-testid={`blog-related-article-${post.slug}`}>
            <BlogPostCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}
