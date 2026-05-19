import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

// E18.4 — small "we're alive and shipping" teaser linking to
// /changelog. Builds trust + reduces "is this maintained?" bounce
// without spending vertical space on a full feed.
//
// Lives just above the Footer so it's the last content the visitor
// sees before reaching the universal footer chrome — natural
// resting-spot for a "by the way, here's what we just shipped" note.

export function ChangelogTeaser() {
  const t = tFor("marketing");
  return (
    <section
      className="mt-12"
      aria-labelledby="home-changelog-teaser-heading"
      data-testid="home-changelog-teaser"
    >
      <Link
        to={ROUTES.zmeny}
        className="group flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/30 px-5 py-4 text-sm transition-colors hover:border-primary/40 hover:bg-card/60"
        data-testid="home-changelog-teaser-link"
      >
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <span className="font-semibold" id="home-changelog-teaser-heading">
          {t("home.changelog_teaser.label")}:
        </span>
        <span className="text-muted-foreground">{t("home.changelog_teaser.body")}</span>
        <span
          className="text-primary group-hover:underline"
          data-testid="home-changelog-teaser-cta"
        >
          {t("home.changelog_teaser.cta")}
        </span>
      </Link>
    </section>
  );
}
