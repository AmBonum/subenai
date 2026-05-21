import { describe, it, expect } from "vitest";

import skAdmin from "@/i18n/locales/sk/admin.json";
import enAdmin from "@/i18n/locales/en/admin.json";
import csAdmin from "@/i18n/locales/cs/admin.json";
import skApp from "@/i18n/locales/sk/app-explainers.json";
import enApp from "@/i18n/locales/en/app-explainers.json";
import csApp from "@/i18n/locales/cs/app-explainers.json";
import { ADMIN_DOCS, APP_DOCS } from "@/lib/docs/manifest";

// E47.1 / E48.1 — contract test between the explainer panels
// (docs.links[].href in every locale bundle) and the docs manifest.
// If an explainer adds a new "View docs →" link without a matching
// entry in ADMIN_DOCS / APP_DOCS, the route handler will 404. This
// test fails closed so the omission is caught at PR time.

interface ExplainerBundle {
  explainers?: Record<
    string,
    {
      docs?: {
        links?: ReadonlyArray<{ href?: string }>;
      };
    }
  >;
}

function collectHrefs(bundle: ExplainerBundle, prefix: string): Set<string> {
  const out = new Set<string>();
  const expl = bundle.explainers ?? {};
  for (const body of Object.values(expl)) {
    const links = body?.docs?.links;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      if (typeof link.href === "string" && link.href.startsWith(prefix)) {
        out.add(link.href);
      }
    }
  }
  return out;
}

function slugFromHref(href: string, prefix: string): string {
  // "/docs/admin/dashboard" → "dashboard"
  return href.slice(prefix.length);
}

const ADMIN_PREFIX = "/docs/admin/";
const APP_PREFIX = "/docs/app/";

const ADMIN_BUNDLES = [
  ["sk", skAdmin],
  ["en", enAdmin],
  ["cs", csAdmin],
] as const;

const APP_BUNDLES = [
  ["sk", skApp],
  ["en", enApp],
  ["cs", csApp],
] as const;

describe("docs manifest covers every explainer doc-link", () => {
  describe.each(ADMIN_BUNDLES)("admin/%s", (_locale, bundle) => {
    const hrefs = collectHrefs(bundle as ExplainerBundle, ADMIN_PREFIX);

    it("emits at least one /docs/admin link", () => {
      expect(hrefs.size).toBeGreaterThan(0);
    });

    it.each([...hrefs].sort())("manifest has entry for %s", (href) => {
      const slug = slugFromHref(href, ADMIN_PREFIX);
      expect(ADMIN_DOCS, `missing ADMIN_DOCS["${slug}"]`).toHaveProperty(slug);
    });
  });

  describe.each(APP_BUNDLES)("app/%s", (_locale, bundle) => {
    const hrefs = collectHrefs(bundle as ExplainerBundle, APP_PREFIX);

    it("emits at least one /docs/app link", () => {
      expect(hrefs.size).toBeGreaterThan(0);
    });

    it.each([...hrefs].sort())("manifest has entry for %s", (href) => {
      const slug = slugFromHref(href, APP_PREFIX);
      expect(APP_DOCS, `missing APP_DOCS["${slug}"]`).toHaveProperty(slug);
    });
  });
});

describe("docs manifest has no orphan entries", () => {
  // Inverse direction: every manifest entry must be referenced by at
  // least one explainer. Stale entries waste i18n review effort and
  // mislead future contributors. SK is the source-of-truth locale.
  const adminHrefs = collectHrefs(skAdmin as ExplainerBundle, ADMIN_PREFIX);
  const appHrefs = collectHrefs(skApp as ExplainerBundle, APP_PREFIX);

  it.each(Object.keys(ADMIN_DOCS).sort())(
    "ADMIN_DOCS entry %s is referenced by an explainer (sk)",
    (slug) => {
      expect(
        adminHrefs.has(`${ADMIN_PREFIX}${slug}`),
        `ADMIN_DOCS["${slug}"] is not linked from any explainer — remove it or wire a link`,
      ).toBe(true);
    },
  );

  it.each(Object.keys(APP_DOCS).sort())(
    "APP_DOCS entry %s is referenced by an explainer (sk)",
    (slug) => {
      expect(
        appHrefs.has(`${APP_PREFIX}${slug}`),
        `APP_DOCS["${slug}"] is not linked from any explainer — remove it or wire a link`,
      ).toBe(true);
    },
  );
});
