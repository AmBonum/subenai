import type { Industry } from "@/content/test-packs";
import { visualForIndustry } from "@/lib/seo/industry-visuals";

interface TestPackHeroFallbackProps {
  industry: Industry;
  emoji: string;
  title: string;
  /** 'card' — used inside catalog grid cards (aspect-video).
   *  'featured' — used for the spotlighted top pack (taller). */
  variant?: "card" | "featured";
  testid?: string;
}

// E25 Phase 1 — programmatic hero zone for TestPackCard. Mirrors the
// BlogHeroFallback design language: industry-mapped gradient + radial
// spotlight + hairline texture + centered emoji as the pictogram.
//
// Reusing the blog visual treatment intentionally — same patterns on
// /tests and /blog grids signal a coherent design system to anyone
// who arrives from one and clicks into the other. The only difference
// is that test packs carry an emoji on the pack manifest already
// (industryEmoji), so we render the emoji directly instead of a SVG
// glyph fetched by category slug.

export function TestPackHeroFallback({
  industry,
  emoji,
  title,
  variant = "card",
  testid,
}: TestPackHeroFallbackProps) {
  const visual = visualForIndustry(industry);
  const aspect = variant === "card" ? "aspect-video" : "aspect-[16/7]";
  const emojiSize = variant === "card" ? "text-6xl" : "text-7xl md:text-8xl";
  return (
    <div
      className={`relative w-full overflow-hidden rounded-t-2xl bg-gradient-to-br ${visual.gradientFrom} ${visual.gradientTo} ${aspect}`}
      data-testid={testid}
      role="img"
      aria-label={title}
    >
      {/* Diagonal hairline texture — same noise pattern as BlogHeroFallback
          so /blog and /tests grids feel like one design system. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.18) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${emojiSize} drop-shadow-lg`} aria-hidden="true">
          {emoji}
        </span>
      </div>
    </div>
  );
}
