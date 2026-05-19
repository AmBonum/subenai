import { Link } from "@tanstack/react-router";
import type { TestPack } from "@/content/test-packs";
import { INDUSTRY_LABEL } from "@/lib/seo/quiz-jsonld";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/quiz";
import { TestPackHeroFallback } from "./TestPackHeroFallback";

interface TestPackCardProps {
  pack: TestPack;
  /** When true, renders a wider featured treatment used for the
   *  top-position spotlight on /tests. Defaults to standard card. */
  featured?: boolean;
}

// E25 Phase 1 — TestPackCard revamp.
//
// Before: emoji + industry chip on a flat card. Visually indistinguishable
// from a list-item row, no signal of category, no visual hook.
// After: two-zone card matching the BlogPostCard visual language —
// industry-gradient hero zone with the pack emoji centered on top, the
// title + tagline + meta on the bottom zone. Featured variant gets a
// taller hero + larger emoji + a "Newest" badge.
export function TestPackCard({ pack, featured = false }: TestPackCardProps) {
  const t = tFor("testy");
  return (
    <Link
      to={ROUTES.testySlug}
      params={{ slug: pack.slug }}
      data-testid={`tests-catalog-card-${pack.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/60 bg-card/70 transition hover:border-primary/50 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <TestPackHeroFallback
        industry={pack.industry}
        emoji={pack.industryEmoji}
        title={pack.title}
        variant={featured ? "featured" : "card"}
        testid={`tests-catalog-card-hero-${pack.slug}`}
      />
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            data-testid={`tests-catalog-card-industry-${pack.slug}`}
            className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs text-muted-foreground"
          >
            {INDUSTRY_LABEL[pack.industry]}
          </span>
          {featured && (
            <span
              data-testid={`tests-catalog-card-featured-${pack.slug}`}
              className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {t("featured_badge")}
            </span>
          )}
        </div>
        <h3
          data-testid={`tests-catalog-card-title-${pack.slug}`}
          className="text-lg font-bold text-foreground group-hover:text-primary"
        >
          {pack.title}
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{pack.tagline}</p>
        <p
          data-testid={`tests-catalog-card-meta-${pack.slug}`}
          className="mt-1 text-xs text-muted-foreground"
        >
          {t("pack_card_meta", { n: pack.questionIds.length, threshold: pack.passingThreshold })}
        </p>
      </div>
    </Link>
  );
}
