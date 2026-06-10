import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { SITE_ORIGIN } from "@/config/site";
import { jsonLdString } from "@/lib/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/schools-jsonld";
import { tFor } from "@/i18n/marketing";

// E19.7 — breadcrumb nav + inline BreadcrumbList JSON-LD.
//
// Replaces the standalone `← Späť na domov` link with proper
// breadcrumb semantics. The inline JSON-LD <script> is what gives
// Google the breadcrumb chip under the SERP listing — we emit it
// here rather than in the route's head() because the JSON depends
// on the i18n-translated label.

export function SchoolsBreadcrumb() {
  const t = tFor("marketing");

  const items = [
    { name: t("skoly.breadcrumb_home"), url: SITE_ORIGIN + "/" },
    { name: t("skoly.breadcrumb_current"), url: SITE_ORIGIN + "/schools" },
  ];

  return (
    <nav aria-label="breadcrumb" data-testid="schools-breadcrumb" className="text-sm">
      <ol className="flex items-center gap-1.5 text-muted-foreground">
        <li>
          <Link
            to={ROUTES.home}
            className="hover:text-foreground"
            data-testid="schools-breadcrumb-home"
          >
            {t("skoly.breadcrumb_home")}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </li>
        <li
          className="font-medium text-foreground"
          aria-current="page"
          data-testid="schools-breadcrumb-current"
        >
          {t("skoly.breadcrumb_current")}
        </li>
      </ol>
      <script
        type="application/ld+json"
        data-testid="schools-breadcrumb-jsonld"
        dangerouslySetInnerHTML={{ __html: jsonLdString(buildBreadcrumbJsonLd(items)) }}
      />
    </nav>
  );
}
