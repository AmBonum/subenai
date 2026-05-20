import { createFileRoute, Link } from "@tanstack/react-router";

import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site";
import { SchoolsDpaForm } from "@/components/schools/SchoolsDpaForm";
import { IS_DPA_FLOW_ENABLED } from "@/lib/dpa/feature-flag";
import { tFor } from "@/i18n/marketing";

// E40.2 — Public DPA intake form route.
//
// School contact fills name + e-mail + school + consent + Turnstile.
// Server (functions/api/dpa-request.ts) validates, inserts a row in
// dpa_requests, returns a base64 PDF for instant browser download.
// E40.4 grafts on an e-mail copy of the same PDF.
//
// Behind feature flag VITE_DPA_FLOW_ENABLED until legal counsel
// signs off on the v0.1 DPA template (E40.3). Flag flips on in E40.6.

const tHead = tFor("marketing");

export const Route = createFileRoute("/schools_/dpa")({
  head: () => ({
    meta: [
      { title: tHead("skoly_dpa.page_title") },
      { name: "description", content: tHead("skoly_dpa.page_description") },
      { name: "robots", content: "noindex, nofollow" },
      { name: "language", content: "sk-SK" },
    ],
    links: [
      { rel: "canonical", href: `${SITE_ORIGIN}/schools/dpa` },
      // Preload the Noto Sans TTFs the DPA PDF renderer (E40.3) will
      // ask for at form-submit time. ~1.1 MB combined — fetching them
      // while the user is still typing avoids a noticeable stall when
      // they click "Vyhotoviť DPA". crossorigin=anonymous is required
      // for the preload to be matched against the eventual react-pdf
      // fetch (which is also same-origin anonymous).
      {
        rel: "preload",
        as: "font",
        type: "font/ttf",
        href: "/fonts/NotoSans-Regular.ttf",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/ttf",
        href: "/fonts/NotoSans-Bold.ttf",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: SchoolsDpaPage,
});

function SchoolsDpaPage() {
  const t = tFor("marketing");
  return (
    <div className="min-h-screen bg-background">
      <main
        className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16"
        data-testid="schools-dpa-main"
      >
        <Link
          to="/schools"
          data-testid="schools-dpa-back-link"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("skoly_dpa.back_link")}
        </Link>
        <h1
          data-testid="schools-dpa-heading"
          className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          {t("skoly_dpa.heading")}
        </h1>
        <p
          data-testid="schools-dpa-intro"
          className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          {t("skoly_dpa.intro")}
        </p>

        <div className="mt-8">
          {IS_DPA_FLOW_ENABLED ? (
            <SchoolsDpaForm />
          ) : (
            <section
              data-testid="schools-dpa-feature-disabled"
              className="space-y-3 rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {t("skoly_dpa.feature_disabled_heading")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("skoly_dpa.feature_disabled_body")}{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("subenai — DPA pre školu")}`}
                  className="underline underline-offset-2 hover:text-foreground"
                  data-testid="schools-dpa-feature-disabled-mailto"
                >
                  {CONTACT_EMAIL}
                </a>
                {t("skoly_dpa.feature_disabled_email_suffix")}
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
