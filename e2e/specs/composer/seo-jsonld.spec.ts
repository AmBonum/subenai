// E33 Phase 2 — SSR contract for JSON-LD WebApplication.
//
// Source plan: tasks/PLAN-2026-05-20-E33-composer-rebrand.md (TC-50, TC-51).
//
// Why an e2e spec when there's already a unit test (`tests/lib/seo/composer-jsonld.test.ts`):
// the unit test verifies the BUILDER FUNCTION returns the right shape.
// What it does NOT verify is that the route's `head()` actually invokes
// the builder and pipes the result into a `<script type="application/ld+json">`
// tag in the SSR HTML. A regression where someone removes the `script` from
// `head()` would silently drop the rich-result eligibility — invisible
// to unit tests, devastating to organic discovery.
//
// Where the JSON-LD is observable depends on the runtime:
//   - Production CF Pages: head() runs in the SSR worker and the JSON-LD
//     ships in the initial HTML response (Google crawler sees it).
//   - `npm run dev` (Vite dev): head() runs CLIENT-side after hydration.
//     The initial HTML response only contains the global root template's
//     Organization + WebSite JSON-LD blocks. The per-route WebApplication
//     block is injected into the DOM by TanStack Router after the lazy
//     route chunk loads and mounts.
//
// We therefore use the DocumentHead POM locators with a wait timeout —
// which observe the DOM after hydration in either runtime — rather than
// `page.content()` (which would capture only the pre-hydration SSR HTML
// and miss the WebApplication block under Vite dev).
//
// Dev server requirement: npm run dev must be running at BASE_URL.

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import type { DocumentHead } from "../../poms/shared/DocumentHead";

interface JsonLdWebApp {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  isAccessibleForFree?: boolean;
  applicationCategory?: string;
  applicationSubCategory?: string;
  offers?: { "@type": string; price: number; priceCurrency: string };
  provider?: { "@type": string; name: string; url: string };
}

async function readWebAppJsonLd(docHead: DocumentHead): Promise<JsonLdWebApp> {
  // Wait up to 15 s for the WebApplication block to land in the DOM. On
  // CF Pages the block is in the initial HTML response and the wait is
  // a no-op; on Vite dev the route chunk has to load + head() runs in the
  // client after mount, which takes 1–3 s on a warm server / longer cold.
  //
  // The locator is .filter({ hasText: "WebApplication" }) rather than nth()
  // because the page already emits two root-template JSON-LD blocks
  // (Organization, WebSite) and the per-route emission order is an
  // implementation detail we don't want to depend on.
  const webAppScript = docHead.jsonLdScripts.filter({ hasText: '"WebApplication"' });
  await webAppScript.waitFor({ state: "attached", timeout: 15_000 });

  const raw = await webAppScript.first().textContent();
  if (!raw) throw new Error("WebApplication JSON-LD block exists but is empty");

  // The block may be either a single object {"@type": "WebApplication", ...}
  // or wrapped in @graph. Composer ships the single-object form (see
  // src/lib/seo/composer-jsonld.ts); we handle both for forward-compat with
  // a future graph migration.
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "@type" in parsed &&
    (parsed as { "@type": unknown })["@type"] === "WebApplication"
  ) {
    return parsed as JsonLdWebApp;
  }
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "@graph" in parsed &&
    Array.isArray((parsed as { "@graph": unknown[] })["@graph"])
  ) {
    for (const node of (parsed as { "@graph": unknown[] })["@graph"]) {
      if (
        typeof node === "object" &&
        node !== null &&
        "@type" in node &&
        (node as { "@type": unknown })["@type"] === "WebApplication"
      ) {
        return node as JsonLdWebApp;
      }
    }
  }

  throw new Error(
    `Parsed JSON-LD block does not contain @type=WebApplication: ${raw.slice(0, 200)}`,
  );
}

test.describe("E33 Phase 1 — composer JSON-LD WebApplication (SSR contract)", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-50 — A WebApplication block is emitted in SSR HTML at /test/builder.
  // This catches the largest regression class: someone removes the
  // <script> from head() (e.g. while refactoring meta tags) and the page
  // silently loses Google rich-result eligibility for "tool" surfaces.
  test("TC-50: emits a WebApplication JSON-LD block at /test/builder", async ({
    composer,
    docHead,
  }) => {
    await composer.open();
    const ld = await readWebAppJsonLd(docHead);

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebApplication");
    expect(ld.url).toContain("/test/builder");
  });

  // TC-51 — All fields required for the "Free Tool" rich badge are present.
  // Google renders a "Free" pill when `isAccessibleForFree=true` AND
  // `offers.price=0`. Missing either suppresses the badge. We also pin
  // the provider block: changing it to anything other than subenai would
  // mis-attribute the result in search.
  test("TC-51: WebApplication JSON-LD has all fields required for the Free Tool rich badge", async ({
    composer,
    docHead,
  }) => {
    await composer.open();
    const ld = await readWebAppJsonLd(docHead);

    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.applicationCategory).toBe("BusinessApplication");
    expect(ld.applicationSubCategory).toBe("Cybersecurity training");

    expect(ld.offers).toBeDefined();
    expect(ld.offers!["@type"]).toBe("Offer");
    expect(ld.offers!.price).toBe(0);
    expect(ld.offers!.priceCurrency).toBe("EUR");

    expect(ld.provider).toBeDefined();
    expect(ld.provider!["@type"]).toBe("Organization");
    expect(ld.provider!.name).toBe("subenai");
    expect(ld.provider!.url).toBe("https://subenai.sk");

    // Sanity: name + description are non-empty (i18n bundle resolved).
    // The unit test pins the exact strings; here we just verify the head()
    // call wired the i18n value through rather than emitting placeholders.
    expect(ld.name.length).toBeGreaterThan(5);
    expect(ld.description.length).toBeGreaterThan(20);
  });
});
