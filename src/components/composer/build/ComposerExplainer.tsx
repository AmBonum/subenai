import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, HelpCircle } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/quiz";

// E33 Phase 1 (D8) — inline decision helper under the h1.
//
// First-time visitors don't always know whether to build a custom
// test (this page) or use a ready-made industry pack at /tests.
// Surfaces that decision explicitly with a 3-line collapsible
// callout, plus a one-click escape hatch to the catalog.
//
// Collapsed by default so it doesn't compete with the primary
// content. The "expanded" affordance is a single button with a
// chevron — same visual language as the FaqAccordion (E26) and
// the Step 2 picker toggle.

export function ComposerExplainer() {
  const t = tFor("composer");
  const [open, setOpen] = useState(false);

  return (
    <div
      data-testid="composer-explainer"
      className="mb-8 rounded-xl border border-border/40 bg-card/30"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="composer-explainer-body"
        data-testid="composer-explainer-toggle"
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-card/60"
      >
        <span className="inline-flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("explainer_heading")}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id="composer-explainer-body"
          data-testid="composer-explainer-body"
          className="space-y-2 border-t border-border/40 px-4 py-3 text-sm text-muted-foreground"
        >
          <p data-testid="composer-explainer-custom">
            <strong className="text-foreground">{t("explainer_custom")}</strong>
          </p>
          <p data-testid="composer-explainer-pack">{t("explainer_pack")}</p>
          <Link
            to={ROUTES.testy}
            data-testid="composer-explainer-cta-packs"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            {t("explainer_cta_to_packs")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
