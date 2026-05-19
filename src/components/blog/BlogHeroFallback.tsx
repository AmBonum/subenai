import { visualForCategory } from "@/lib/blog/category-visuals";

interface BlogHeroFallbackProps {
  categorySlug: string;
  title: string;
  // 'card' — used inside list cards (aspect-video, smaller glyph)
  // 'banner' — used at the top of an article page (taller, big glyph)
  variant?: "card" | "banner";
  testid?: string;
}

// Programmatic hero placeholder for articles without a hero_image_url.
// Renders a category-themed gradient with the category glyph as a
// large decorative motif + the article title overlaid (banner variant
// only). Keeps the visual grammar consistent across 80+ articles
// without shipping per-article image assets — when a real image lands
// in the DB, the route swaps this out automatically.
export function BlogHeroFallback({
  categorySlug,
  title,
  variant = "card",
  testid,
}: BlogHeroFallbackProps) {
  const visual = visualForCategory(categorySlug);
  const aspect = variant === "card" ? "aspect-video" : "aspect-[21/9] md:aspect-[3/1]";
  const glyphSize = variant === "card" ? "text-7xl md:text-8xl" : "text-[140px] md:text-[200px]";
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-br ${visual.gradientFrom} ${visual.gradientTo} ${aspect}`}
      data-testid={testid}
      role="img"
      aria-label={title}
    >
      {/* Decorative diagonal noise/grain via repeating linear gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 12px)",
        }}
      />
      <span
        aria-hidden="true"
        className={`absolute -right-4 -top-4 select-none opacity-30 ${glyphSize}`}
      >
        {visual.glyph}
      </span>
      {variant === "banner" && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 md:p-10">
          <h1 className="text-2xl font-bold text-white md:text-4xl lg:text-5xl">{title}</h1>
        </div>
      )}
    </div>
  );
}
