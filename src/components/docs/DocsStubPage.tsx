import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import { CONTACT_EMAIL } from "@/config/site";
import { Card, CardContent } from "@/components/ui/card";
import { tFor } from "@/i18n/docs";

// E47.1 / E48.1 — placeholder for every /docs/admin/* and /docs/app/*
// route until real documentation lands. Renders a friendly "coming
// soon" message and a back-link to the relevant shell. Each doc URL
// linked from an explainer panel resolves here so users no longer hit
// a hard 404 while clicking through.

export interface DocsStubPageProps {
  area: "admin" | "app";
  slug: string;
}

export function DocsStubPage({ area, slug }: DocsStubPageProps) {
  const t = tFor("stub");
  const backTo = area === "admin" ? "/admin" : "/app";
  const backLabel = area === "admin" ? t("back_to_admin") : t("back_to_app");

  return (
    <div
      data-testid="docs-stub-root"
      data-doc-area={area}
      data-doc-slug={slug}
      className="mx-auto max-w-2xl space-y-8 px-4 py-12 sm:py-16"
    >
      <p
        data-testid="docs-stub-eyebrow"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {t("eyebrow")} · {area}/{slug}
      </p>

      <h1
        data-testid="docs-stub-title"
        className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        {t("coming_soon_title")}
      </h1>

      <p data-testid="docs-stub-body" className="text-base leading-relaxed text-muted-foreground">
        {t("coming_soon_body")}
      </p>

      <Card className="border-border/60 bg-muted/40">
        <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm text-muted-foreground">
          <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{t("report_missing")}</span>
          <a
            data-testid="docs-stub-contact-link"
            href={`mailto:${CONTACT_EMAIL}?subject=Doc%20request%3A%20${area}%2F${slug}`}
            className="text-primary underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
          >
            {CONTACT_EMAIL}
          </a>
        </CardContent>
      </Card>

      <Link
        data-testid="docs-stub-back-link"
        to={backTo}
        className="inline-flex items-center text-sm font-medium text-primary underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
      >
        {backLabel}
      </Link>
    </div>
  );
}
