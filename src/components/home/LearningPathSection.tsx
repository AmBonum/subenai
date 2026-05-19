import { Link } from "@tanstack/react-router";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E18.2 — Learning Path section. Visualises the 3-surface funnel
// (Test → Školenia → Akadémia) so a first-time visitor understands
// they're not deciding which ONE to use — they're seeing a sequence
// where each step builds on the previous.
//
// Senior-strategy rationale documented in
// tasks/PLAN-2026-05-19-E18-home-conversion-hub.md §E18.2 — addresses
// the test ↔ course ↔ article positioning ambiguity flagged in the
// 2026-05-19 user analysis.
//
// Visual: 3 horizontal cards (mobile: stacked) with a connecting
// chevron between them. CSS-only — no SVG asset cost. The chevron
// is purely decorative (aria-hidden) so screen readers see a clean
// ordered list.

interface PathStep {
  // i18n key suffix — e.g. 'step1' → home.learning_path.step1_*
  key: "step1" | "step2" | "step3";
  emoji: string;
  to: string;
}

const STEPS: ReadonlyArray<PathStep> = [
  { key: "step1", emoji: "🎯", to: ROUTES.test },
  { key: "step2", emoji: "⚡", to: ROUTES.skolenia },
  { key: "step3", emoji: "📖", to: ROUTES.blog },
];

export function LearningPathSection() {
  const t = tFor("marketing");
  return (
    <section
      className="mt-24"
      aria-labelledby="home-learning-path-heading"
      data-testid="home-learning-path-section"
    >
      <div className="text-center">
        <p
          className="text-xs font-semibold uppercase tracking-widest text-primary"
          data-testid="home-learning-path-kicker"
        >
          {t("home.learning_path.kicker")}
        </p>
        <h2
          id="home-learning-path-heading"
          className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          data-testid="home-learning-path-heading"
        >
          {t("home.learning_path.heading")}
        </h2>
        <p
          className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base"
          data-testid="home-learning-path-subheading"
        >
          {t("home.learning_path.subheading")}
        </p>
      </div>

      <ol className="mt-12 grid gap-6 md:grid-cols-3" data-testid="home-learning-path-steps">
        {STEPS.map((step, i) => (
          <li
            key={step.key}
            className="relative"
            data-testid={`home-learning-path-step-${step.key}`}
          >
            <Link
              to={step.to}
              className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card"
              data-testid={`home-learning-path-link-${step.key}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden="true">
                  {step.emoji}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  {t(`home.learning_path.${step.key}_label`)}
                </span>
              </div>
              <h3
                className="mt-4 text-lg font-bold tracking-tight"
                data-testid={`home-learning-path-title-${step.key}`}
              >
                {t(`home.learning_path.${step.key}_title`)}
              </h3>
              <p
                className="mt-2 flex-1 text-sm text-muted-foreground"
                data-testid={`home-learning-path-desc-${step.key}`}
              >
                {t(`home.learning_path.${step.key}_desc`)}
              </p>
              <span
                className="mt-4 text-sm font-semibold text-primary group-hover:underline"
                data-testid={`home-learning-path-cta-${step.key}`}
              >
                {t(`home.learning_path.${step.key}_cta`)} →
              </span>
            </Link>
            {/* Chevron connector to the next step — visible only on
                desktop (md+), hidden on mobile where the cards stack
                vertically. Sits absolutely-positioned at the right
                edge of each card except the last. */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-muted-foreground md:block"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-10 flex justify-center">
        <Link
          to={ROUTES.test}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          data-testid="home-learning-path-footer-cta"
        >
          {t("home.learning_path.footer_cta")}
        </Link>
      </div>
    </section>
  );
}
