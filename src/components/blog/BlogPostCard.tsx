import { Link } from "@tanstack/react-router";

import { tFor } from "@/i18n/blog";
import type { BlogPostListItem } from "@/lib/blog/queries";
import { isPillarSlug } from "@/lib/blog/pillar-slugs";
import { formatDateLongSk } from "@/lib/format/date";

import { BlogHeroFallback } from "./BlogHeroFallback";
import { CategoryBadge } from "./CategoryBadge";

interface BlogPostCardProps {
  post: BlogPostListItem;
  // 'default' — standard 3-col grid card
  // 'featured' — larger 2-col span card (used in featured pillar row)
  // 'compact' — used in related-articles sidebar, no excerpt
  variant?: "default" | "featured" | "compact";
}

// Senior-UX card: pillar-aware ring, category badge, gradient fallback
// when no hero, reading-time meta, hover-lift. Whole card is one
// link — the inner category-badge is visually a chip but kept as
// 'static' to avoid nested <a> elements (a11y + HTML validity).
export function BlogPostCard({ post, variant = "default" }: BlogPostCardProps) {
  const t = tFor("post");
  const pillar = isPillarSlug(post.slug);
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const published = formatDateLongSk(post.published_at);
  const card = (
    <Link
      to="/academy/$slug"
      params={{ slug: post.slug }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/30 hover:shadow-card ${
        pillar ? "ring-1 ring-primary/40" : ""
      }`}
      data-testid={`blog-post-card-link-${post.slug}`}
    >
      <div className="relative">
        {post.hero_image_url ? (
          <img
            src={post.hero_image_url}
            alt=""
            loading="lazy"
            className={`w-full object-cover ${isFeatured ? "aspect-[2/1]" : "aspect-video"}`}
            data-testid={`blog-post-card-image-${post.slug}`}
          />
        ) : (
          <BlogHeroFallback
            categorySlug={post.category.slug}
            title={post.title}
            variant="card"
            testid={`blog-post-card-fallback-${post.slug}`}
          />
        )}
        {pillar && (
          <span
            className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-md"
            data-testid={`blog-post-card-pillar-badge-${post.slug}`}
            title="Hĺbkový sprievodca — odporúčaný úvod do témy."
          >
            sprievodca
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col p-5 ${isFeatured ? "md:p-6" : ""}`}>
        <div className="mb-3">
          <CategoryBadge
            slug={post.category.slug}
            name={post.category.name}
            variant="static"
            testid={`blog-post-card-category-${post.slug}`}
          />
        </div>
        <h3
          // hyphens-auto + break-words so a very long Slovak word
          // ("rozpoznávanie") wraps instead of forcing the title past the
          // card's overflow-hidden edge; the featured size is a notch
          // smaller so long pillar titles stay fully visible.
          lang="sk"
          className={`font-bold tracking-tight text-foreground transition-colors hyphens-auto [overflow-wrap:anywhere] group-hover:text-primary ${
            isFeatured ? "text-xl md:text-2xl" : "text-lg md:text-xl"
          }`}
          data-testid={`blog-post-card-title-${post.slug}`}
        >
          {post.title}
        </h3>
        {!isCompact && (
          <p
            className={`mt-3 line-clamp-3 text-muted-foreground ${
              isFeatured ? "text-base" : "text-sm"
            }`}
            data-testid={`blog-post-card-excerpt-${post.slug}`}
          >
            {post.excerpt}
          </p>
        )}
        <div
          className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground"
          data-testid={`blog-post-card-meta-${post.slug}`}
        >
          <span data-testid={`blog-post-card-date-${post.slug}`}>{published}</span>
          {post.reading_minutes != null && (
            <>
              <span aria-hidden="true">·</span>
              <span data-testid={`blog-post-card-reading-time-${post.slug}`}>
                {t("reading_time", { minutes: String(post.reading_minutes) })}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
  return card;
}
