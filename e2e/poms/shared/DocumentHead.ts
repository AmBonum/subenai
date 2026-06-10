import type { Locator, Page } from "@playwright/test";

/**
 * Document <head> POM — meta/link/script tags have no data-testid hooks
 * (they are not interactive DOM), so SEO specs share these element
 * locators here instead of calling `page.locator(...)` directly.
 *
 * Runtime caveat (same as the per-route SEO specs): on production CF
 * Pages the route `head()` runs in the SSR worker and the tags ship in
 * the initial HTML; under `npm run dev` they are injected client-side
 * after hydration. Locators observe the DOM either way.
 */
export class DocumentHead {
  constructor(private readonly page: Page) {}

  get metaDescription(): Locator {
    return this.page.locator('meta[name="description"]');
  }

  get robotsMeta(): Locator {
    return this.page.locator('meta[name="robots"]');
  }

  get canonicalLink(): Locator {
    return this.page.locator('link[rel="canonical"]');
  }

  get jsonLdScripts(): Locator {
    return this.page.locator('script[type="application/ld+json"]');
  }

  async metaDescriptionContent(): Promise<string | null> {
    return this.metaDescription.getAttribute("content");
  }

  async robotsContent(): Promise<string | null> {
    return this.robotsMeta.getAttribute("content");
  }

  async canonicalHref(): Promise<string | null> {
    return this.canonicalLink.getAttribute("href");
  }
}
