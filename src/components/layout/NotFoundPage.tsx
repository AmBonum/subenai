import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Compass, GraduationCap, Home, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/quiz";

// E22 — Senior 404 surface. Replaces the previous 4-LOC content
// (number + heading + paragraph + back-home button) with a helpful
// landing that suggests where the visitor probably wanted to go.
//
// Rendered by __root.tsx as `notFoundComponent`. Triggers on:
//   - unknown public URLs (typo, broken backlinks)
//   - removed/renamed routes (article deleted, course removed)
//   - link rot from external sources
//
// Design: inline geometric SVG (same pattern as EduWorkflowSteps —
// abstract, aria-hidden, currentColor) + 4 destination cards. No
// data-fetching, no consent gates, no auth. Pure presentational.

interface Suggestion {
  testId: string;
  to: keyof typeof ROUTES;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  accent: "primary" | "success" | "default";
}

const SUGGESTIONS: Suggestion[] = [
  {
    testId: "test",
    to: "test",
    icon: Compass,
    titleKey: "not_found_suggestions.test_title",
    descKey: "not_found_suggestions.test_desc",
    accent: "primary",
  },
  {
    testId: "academy",
    to: "blog",
    icon: BookOpen,
    titleKey: "not_found_suggestions.academy_title",
    descKey: "not_found_suggestions.academy_desc",
    accent: "default",
  },
  {
    testId: "courses",
    to: "skolenia",
    icon: GraduationCap,
    titleKey: "not_found_suggestions.courses_title",
    descKey: "not_found_suggestions.courses_desc",
    accent: "default",
  },
  {
    testId: "schools",
    to: "skoly",
    icon: Map,
    titleKey: "not_found_suggestions.schools_title",
    descKey: "not_found_suggestions.schools_desc",
    accent: "success",
  },
];

const ACCENT_CLASSES: Record<Suggestion["accent"], string> = {
  primary: "border-primary/40 hover:border-primary/60 bg-primary/5",
  success: "border-success/40 hover:border-success/60 bg-success/5",
  default: "border-border/60 hover:border-border bg-card/40",
};

const ACCENT_ICON: Record<Suggestion["accent"], string> = {
  primary: "text-primary",
  success: "text-success",
  default: "text-foreground",
};

// Lost-compass illustration — abstract geometric, no text inside.
// Matches /schools EduWorkflowSteps + /app/help empty-state SVG style.
function LostIllustration() {
  return (
    <svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      aria-hidden="true"
      focusable="false"
      className="mx-auto opacity-90"
    >
      {/* Big circle — globe-ish frame */}
      <circle
        cx="100"
        cy="80"
        r="60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground"
      />
      {/* Concentric ring */}
      <circle
        cx="100"
        cy="80"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        className="text-muted-foreground/60"
      />
      {/* Compass needle pointing nowhere specific (off-axis = "lost") */}
      <path d="M100 36l8 44-8-10-8 10z" fill="currentColor" className="text-primary" />
      <path
        d="M100 124l-8-44 8 10 8-10z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground"
      />
      {/* Center pin */}
      <circle cx="100" cy="80" r="4" fill="currentColor" className="text-primary" />
      {/* Question mark hovering above */}
      <circle
        cx="148"
        cy="34"
        r="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary/50"
      />
      <path
        d="M143 30c0-3 2-5 5-5s5 2 5 5c0 2-1 3-3 4-1.5.8-2 1.5-2 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-primary"
      />
      <circle cx="148" cy="40" r="1.5" fill="currentColor" className="text-primary" />
    </svg>
  );
}

export function NotFoundPage() {
  const tErr = tFor("errors");
  // `back_to_start` lives in the `common` namespace, not `results` —
  // a prior author named the local `t` without realizing the section
  // shifted (2026-05-19 finding from Phase 8 e2e snapshot showed raw
  // key `back_to_start` rendering on 404 in prod).
  const tCommon = tFor("common");

  return (
    <div className="min-h-screen bg-background">
      <main
        className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 sm:px-6 sm:py-24"
        data-testid="not-found-root"
      >
        <LostIllustration />

        <p
          className="mt-6 text-xs font-bold uppercase tracking-widest text-muted-foreground"
          data-testid="not-found-kicker"
        >
          {tErr("not_found_kicker")}
        </p>

        <h1
          className="mt-2 text-center text-3xl font-black tracking-tight text-foreground sm:text-4xl"
          data-testid="not-found-title"
        >
          {tErr("not_found_title")}
        </h1>

        <p
          className="mt-3 max-w-xl text-center text-sm text-muted-foreground sm:text-base"
          data-testid="not-found-body"
        >
          {tErr("not_found_body")}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            data-testid="not-found-home-cta"
          >
            <Home className="size-4" aria-hidden="true" />
            {tCommon("back_to_start")}
          </Link>
        </div>

        <section
          className="mt-12 w-full"
          aria-labelledby="not-found-suggestions-heading"
          data-testid="not-found-suggestions"
        >
          <h2
            id="not-found-suggestions-heading"
            className="text-center text-sm font-semibold text-muted-foreground"
            data-testid="not-found-hint"
          >
            {tErr("not_found_hint")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.testId}
                  to={ROUTES[s.to]}
                  className={`group flex items-start gap-4 rounded-2xl border-2 p-5 transition-colors ${ACCENT_CLASSES[s.accent]}`}
                  data-testid={`not-found-suggestion-${s.testId}`}
                >
                  <Icon className={`size-6 shrink-0 ${ACCENT_ICON[s.accent]}`} aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-base font-bold text-foreground">{tErr(s.titleKey)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tErr(s.descKey)}</p>
                  </div>
                  <ArrowRight
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
