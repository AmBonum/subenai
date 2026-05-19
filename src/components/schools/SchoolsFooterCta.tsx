import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Compass, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E19.7 — footer cross-link triangle (test / composer / academy).
//
// Joins /schools to the cross-link triangle shipped in E17. Composer
// card carries the lime accent (primary action for school decision-
// makers); test and academy are secondary discovery paths. Replaces
// the old single-CTA outro box.

interface Card {
  testId: string;
  to: keyof typeof ROUTES;
  icon: LucideIcon;
  title: string;
  desc: string;
  label: string;
  accent: "success" | "primary" | "default";
}

const ACCENT_CLASSES: Record<Card["accent"], string> = {
  success:
    "border-success/40 hover:border-success/60 bg-gradient-to-br from-success/10 via-success/5 to-transparent",
  primary:
    "border-primary/40 hover:border-primary/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
  default: "border-border/60 hover:border-border bg-card/40",
};

const ACCENT_ICON: Record<Card["accent"], string> = {
  success: "text-success",
  primary: "text-primary",
  default: "text-foreground",
};

export function SchoolsFooterCta() {
  const t = tFor("marketing");

  const cards: Card[] = [
    {
      testId: "composer",
      to: "zostav",
      icon: GraduationCap,
      title: t("skoly.footer_cta_composer_title"),
      desc: t("skoly.footer_cta_composer_desc"),
      label: t("skoly.footer_cta_composer_label"),
      accent: "success",
    },
    {
      testId: "test",
      to: "test",
      icon: Compass,
      title: t("skoly.footer_cta_test_title"),
      desc: t("skoly.footer_cta_test_desc"),
      label: t("skoly.footer_cta_test_label"),
      accent: "primary",
    },
    {
      testId: "blog",
      to: "blog",
      icon: BookOpen,
      title: t("skoly.footer_cta_blog_title"),
      desc: t("skoly.footer_cta_blog_desc"),
      label: t("skoly.footer_cta_blog_label"),
      accent: "default",
    },
  ];

  return (
    <section
      className="mt-16"
      aria-labelledby="schools-footer-cta-heading"
      data-testid="schools-footer-cta"
    >
      <h2
        id="schools-footer-cta-heading"
        className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        data-testid="schools-footer-cta-heading"
      >
        {t("skoly.footer_heading")}
      </h2>
      <p
        className="mt-2 max-w-2xl text-sm text-muted-foreground"
        data-testid="schools-footer-cta-subheading"
      >
        {t("skoly.footer_subheading")}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.testId}
              to={ROUTES[card.to]}
              className={`group flex flex-col rounded-2xl border-2 p-5 transition-colors ${ACCENT_CLASSES[card.accent]}`}
              data-testid={`schools-footer-cta-${card.testId}`}
            >
              <Icon className={`size-6 ${ACCENT_ICON[card.accent]}`} aria-hidden="true" />
              <h3 className="mt-3 text-base font-bold text-foreground">{card.title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{card.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                {card.label}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
