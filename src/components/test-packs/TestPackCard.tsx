import { Link } from "@tanstack/react-router";
import type { TestPack } from "@/content/test-packs";
import { INDUSTRY_LABEL } from "@/lib/seo/quiz-jsonld";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/quiz";

export function TestPackCard({ pack }: { pack: TestPack }) {
  const t = tFor("testy");
  return (
    <Link
      to={ROUTES.testySlug}
      params={{ slug: pack.slug }}
      data-testid={`tests-catalog-card-${pack.slug}`}
      className="group block rounded-2xl border border-border/60 bg-card/70 p-5 transition hover:border-primary/50 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-4xl" aria-hidden="true">
          {pack.industryEmoji}
        </span>
        <span className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs text-muted-foreground">
          {INDUSTRY_LABEL[pack.industry]}
        </span>
      </div>
      <h3
        data-testid={`tests-catalog-card-title-${pack.slug}`}
        className="text-lg font-bold text-foreground group-hover:text-primary"
      >
        {pack.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{pack.tagline}</p>
      <p
        data-testid={`tests-catalog-card-meta-${pack.slug}`}
        className="mt-3 text-xs text-muted-foreground"
      >
        {t("pack_card_meta", { n: pack.questionIds.length, threshold: pack.passingThreshold })}
      </p>
    </Link>
  );
}
