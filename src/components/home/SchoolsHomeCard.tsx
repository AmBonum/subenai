import { Link } from "@tanstack/react-router";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E18.3 — dedicated /schools surface on the homepage.
//
// Before E18: /schools was only buried in the footer + behind a
// passing mention in the mission paragraph. /schools is the
// highest-LTV conversion (a single teacher signing up brings a
// whole class), so it deserves a dedicated home card.
//
// Visual differentiation: lime/emerald accent (vs. the primary
// blue used by B2C surfaces) so B2B viewers immediately recognise
// the card targets them. Same component class as the mission panel
// (gradient overlay + dual-CTA layout) — keeps the home rhythm
// consistent.

export function SchoolsHomeCard() {
  const t = tFor("marketing");
  return (
    <section
      aria-labelledby="home-schools-heading"
      className="relative mt-20 overflow-hidden rounded-3xl border border-success/40 bg-card p-8 sm:p-12"
      data-testid="home-schools-section"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-success/15 via-primary/5 to-transparent"
      />
      <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <div className="max-w-xl space-y-3">
          <p
            className="text-xs font-bold uppercase tracking-widest text-success"
            data-testid="home-schools-kicker"
          >
            {t("home.schools_card.kicker")}
          </p>
          <h2
            id="home-schools-heading"
            className="text-2xl font-black tracking-tight sm:text-3xl"
            data-testid="home-schools-heading"
          >
            {t("home.schools_card.heading")}
          </h2>
          <p
            className="text-sm leading-relaxed text-muted-foreground sm:text-base"
            data-testid="home-schools-body"
          >
            {t("home.schools_card.body")}
          </p>
        </div>
        <Link
          to={ROUTES.skoly}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-success/60 bg-success/10 px-6 py-3 text-base font-bold text-foreground transition-colors hover:bg-success/20"
          data-testid="home-schools-cta"
        >
          {t("home.schools_card.cta")}
        </Link>
      </div>
    </section>
  );
}
