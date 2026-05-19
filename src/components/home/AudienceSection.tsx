import { Link } from "@tanstack/react-router";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E18.1 — audience-segmented section. Senior-marketing pattern:
// speak to the persona's identity FIRST ("you are X"), then to the
// pain ("you struggle with Y"), then to the action ("here's where
// to start"). Trumps generic "we have features" because the reader
// self-identifies in 2 seconds and skips straight to their persona
// row instead of scanning all 4.
//
// Persona → entry route mapping:
//   - Bežný človek → /test (the 3-min diagnostic)
//   - Rodič/senior → /blog/kategoria/rodicia-a-seniori (curated content)
//   - Firma/HR     → /tests (per-industry quiz sets)
//   - Lektor/škola → /schools (edu mód — dashboard, group management)
//
// Heads-up to future contributors: if a new persona lands (e.g.
// 'verejná správa'), add a 5th card AND a tagline at the top
// acknowledging the new audience. Don't silently expand the grid —
// users count the number of cards to assess "is one of these me?"

const PERSONA_KEYS = ["bezni", "rodicia", "firmy", "ucitelia"] as const;
type PersonaKey = (typeof PERSONA_KEYS)[number];

const EMOJI: Record<PersonaKey, string> = {
  bezni: "🙋",
  rodicia: "👨‍👩‍👧",
  firmy: "🏢",
  ucitelia: "🎓",
};

const ROUTE: Record<PersonaKey, { to: string; params?: Record<string, string> }> = {
  bezni: { to: ROUTES.test },
  rodicia: { to: "/blog/kategoria/$slug", params: { slug: "rodicia-a-seniori" } },
  firmy: { to: ROUTES.testy },
  ucitelia: { to: ROUTES.skoly },
};

export function AudienceSection() {
  const t = tFor("marketing");
  return (
    <section
      className="mt-24"
      aria-labelledby="home-audience-heading"
      data-testid="home-audience-section"
    >
      <div className="text-center">
        <p
          className="text-xs font-semibold uppercase tracking-widest text-primary"
          data-testid="home-audience-kicker"
        >
          {t("home.audience.kicker")}
        </p>
        <h2
          id="home-audience-heading"
          className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          data-testid="home-audience-heading"
        >
          {t("home.audience.heading")}
        </h2>
        <p
          className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base"
          data-testid="home-audience-subheading"
        >
          {t("home.audience.subheading")}
        </p>
      </div>

      <ul
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="home-audience-grid"
      >
        {PERSONA_KEYS.map((key) => {
          const route = ROUTE[key];
          return (
            <li key={key} data-testid={`home-audience-card-${key}`}>
              <Link
                to={route.to}
                params={route.params}
                className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card"
                data-testid={`home-audience-link-${key}`}
              >
                <span className="text-3xl" aria-hidden="true">
                  {EMOJI[key]}
                </span>
                <h3
                  className="mt-4 text-lg font-bold tracking-tight"
                  data-testid={`home-audience-title-${key}`}
                >
                  {t(`home.audience.${key}.title`)}
                </h3>
                <p
                  className="mt-2 flex-1 text-sm text-muted-foreground"
                  data-testid={`home-audience-desc-${key}`}
                >
                  {t(`home.audience.${key}.desc`)}
                </p>
                <span
                  className="mt-4 text-sm font-semibold text-primary group-hover:underline"
                  data-testid={`home-audience-cta-${key}`}
                >
                  {t(`home.audience.${key}.cta`)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
