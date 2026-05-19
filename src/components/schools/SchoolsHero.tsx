import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, ShieldCheck, Users } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E19.2 — outcome-first hero for /schools.
//
// Mirrors the lime/success accent set by SchoolsHomeCard on the home
// page (continuity of identity across the click). H1 is outcome-led
// (what the teacher achieves), not feature-led (what subenai is).
// Three persona chips deliberately call out the three readers so each
// one immediately knows "this page is for me".
//
// Hero also carries the proof strip — 4 mini-stats (zadarmo / 3 min /
// GDPR / 12 mes) — that compress the value prop into one line above
// the fold.

const PERSONA_ICONS = {
  riaditel: ShieldCheck,
  itkoord: Users,
  ucitel: GraduationCap,
} as const;

export function SchoolsHero() {
  const t = tFor("marketing");
  const personas: Array<{ slug: keyof typeof PERSONA_ICONS; key: string }> = [
    { slug: "riaditel", key: "skoly.hero_persona_riaditel" },
    { slug: "itkoord", key: "skoly.hero_persona_itkoord" },
    { slug: "ucitel", key: "skoly.hero_persona_ucitel" },
  ];
  const proofItems = [
    { emph: "skoly.proof_item1_emph", label: "skoly.proof_item1_label" },
    { emph: "skoly.proof_item2_emph", label: "skoly.proof_item2_label" },
    { emph: "skoly.proof_item3_emph", label: "skoly.proof_item3_label" },
    { emph: "skoly.proof_item4_emph", label: "skoly.proof_item4_label" },
  ];

  return (
    <section
      className="mt-6 overflow-hidden rounded-3xl border border-success/40 bg-gradient-to-br from-success/10 via-success/5 to-transparent p-6 md:p-10"
      aria-labelledby="schools-hero-heading"
      data-testid="schools-hero"
    >
      <p
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-success"
        data-testid="schools-hero-kicker"
      >
        <GraduationCap className="size-3.5" aria-hidden="true" />
        {t("skoly.hero_kicker")}
      </p>

      <h1
        id="schools-hero-heading"
        className="mt-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
        data-testid="schools-hero-title"
      >
        {t("skoly.hero_title")}
      </h1>

      <p
        className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
        data-testid="schools-hero-subtitle"
      >
        {t("skoly.hero_subtitle")}
      </p>

      <ul
        className="mt-5 flex flex-wrap gap-2"
        aria-label="audience"
        data-testid="schools-hero-personas"
      >
        {personas.map(({ slug, key }) => {
          const Icon = PERSONA_ICONS[slug];
          return (
            <li
              key={slug}
              className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-card/60 px-3 py-1.5 text-xs font-semibold text-foreground"
              data-testid={`schools-hero-persona-${slug}`}
            >
              <Icon className="size-3.5 text-success" aria-hidden="true" />
              {t(key)}
            </li>
          );
        })}
      </ul>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          to={ROUTES.zostav}
          className="inline-flex items-center gap-1.5 rounded-full bg-success px-6 py-3 text-sm font-bold text-success-foreground shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          data-testid="schools-hero-cta"
        >
          {t("skoly.hero_cta")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          to={ROUTES.test}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
          data-testid="schools-hero-cta-secondary"
        >
          {t("skoly.hero_cta_secondary")}
        </Link>
      </div>

      <div
        className="mt-8 grid grid-cols-2 gap-3 border-t border-success/30 pt-6 md:grid-cols-4"
        aria-label={t("skoly.proof_kicker")}
        data-testid="schools-hero-proof"
      >
        {proofItems.map((p, i) => (
          <div key={i} data-testid={`schools-hero-proof-${i + 1}`}>
            <div className="text-xl font-black tracking-tight text-success md:text-2xl">
              {t(p.emph)}
            </div>
            <div className="mt-1 text-xs leading-snug text-muted-foreground">{t(p.label)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
