import { visualForCategory } from "@/lib/blog/category-visuals";

import { CategoryIllustration } from "./CategoryIllustration";

interface BlogHeroFallbackProps {
  categorySlug: string;
  title: string;
  // 'card' — used inside list cards (aspect-video, smaller motif)
  // 'banner' — used at the top of an article page (taller, big motif)
  variant?: "card" | "banner";
  testid?: string;
}

// E16.4 — programmatic hero placeholder for articles without a
// hero_image_url. Each category has a custom SVG illustration
// (src/components/blog/CategoryIllustration.tsx) rendered centered on
// the category-themed gradient. Replaces the prior emoji-in-corner
// placeholder — the SVGs follow a single design system (200×200
// viewBox, 2.5-unit stroke, currentColor white on the gradient) so
// the 15 categories share a coherent visual language.

export function BlogHeroFallback({
  categorySlug,
  title,
  variant = "card",
  testid,
}: BlogHeroFallbackProps) {
  const visual = visualForCategory(categorySlug);
  const aspect = variant === "card" ? "aspect-video" : "aspect-[21/9] md:aspect-[3/1]";
  // Centered illustration sized to fill ~55% of the shorter axis;
  // viewport units would over-grow on banner — fixed % of the bg via
  // absolute inset keeps the look identical at every breakpoint.
  const illustrationSize = variant === "card" ? "h-2/3 w-2/3" : "h-3/4 w-1/2";
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-br ${visual.gradientFrom} ${visual.gradientTo} ${aspect}`}
      data-testid={testid}
      role="img"
      aria-label={title}
    >
      {/* Diagonal hairline texture for depth — same noise pattern
          everywhere so the gradient doesn't feel flat. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 14px)",
        }}
      />
      {/* Radial spotlight from the center for visual depth */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.18) 0%, transparent 60%)",
        }}
      />
      {/* Centered category illustration */}
      <div className="absolute inset-0 flex items-center justify-center">
        <CategoryIllustration
          slug={categorySlug}
          className={`flex items-center justify-center text-white/90 ${illustrationSize} [&_svg]:h-full [&_svg]:w-full`}
          testid={`category-illustration-${categorySlug}`}
        />
      </div>
      {/* Banner variant previously rendered a second <h1> overlay,
          duplicating the article page's own <h1> (already rendered in
          the article header above the hero). HTML semantics demand one
          H1; screen readers also read the image's aria-label as the
          title, so a third title surface was redundant. The gradient
          overlay is kept for visual depth even without text. */}
      {variant === "banner" && (
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
      )}
    </div>
  );
}
