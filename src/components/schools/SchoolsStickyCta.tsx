import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E19.5 — mobile-only sticky bottom CTA.
//
// On a long-scroll marketing page, primary conversion (Composer link)
// is below the fold and the visitor can scroll past every CTA without
// taking action. Sticky bar fixes that on mobile while staying
// invisible on desktop where the hero CTA stays in viewport longer.

export function SchoolsStickyCta() {
  const t = tFor("marketing");
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden"
      data-testid="schools-sticky-cta-bar"
      role="region"
      aria-label={t("skoly.sticky_cta")}
    >
      <Link
        to={ROUTES.zostav}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-success px-5 py-3 text-sm font-bold text-success-foreground shadow-md"
        data-testid="schools-sticky-cta"
      >
        {t("skoly.sticky_cta")}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
