import { Link } from "@tanstack/react-router";

import { visualForCategory } from "@/lib/blog/category-visuals";

interface CategoryBadgeProps {
  slug: string;
  name: string;
  // 'link' — clickable chip pointing to the category archive
  // 'static' — non-interactive label (used on hero, where the whole
  // card is already a link to the article).
  variant?: "link" | "static";
  size?: "sm" | "md";
  testid?: string;
}

// Single-source category chip with the slug-derived accent color.
// Rendering rule: use 'link' inside lists where the user might want to
// scope to a category; use 'static' inside article-card headers to
// avoid nested clickable areas (a11y).
export function CategoryBadge({
  slug,
  name,
  variant = "static",
  size = "sm",
  testid,
}: CategoryBadgeProps) {
  const visual = visualForCategory(slug);
  const cls =
    size === "sm"
      ? "px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
      : "px-3 py-1 text-xs font-semibold uppercase tracking-wider";
  const base = `inline-flex items-center gap-1.5 rounded-full ring-1 ${cls}`;
  const style = {
    color: visual.accentHex,
    backgroundColor: `${visual.accentHex}1a`, // 10% alpha
    boxShadow: `inset 0 0 0 1px ${visual.accentHex}40`,
  } as const;
  const content = (
    <>
      <span aria-hidden="true">{visual.glyph}</span>
      <span>{name}</span>
    </>
  );
  if (variant === "static") {
    return (
      <span className={base} style={style} data-testid={testid}>
        {content}
      </span>
    );
  }
  return (
    <Link
      to="/blog/kategoria/$slug"
      params={{ slug }}
      className={`${base} transition-transform hover:scale-105`}
      style={style}
      data-testid={testid}
    >
      {content}
    </Link>
  );
}
