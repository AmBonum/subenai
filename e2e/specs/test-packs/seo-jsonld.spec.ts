import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";

/**
 * E37 — SEO JSON-LD blobs on /tests + /tests/$slug.
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-14, TC-15).
 *
 * The catalog route emits TWO `<script type="application/ld+json">` blocks:
 *   - ItemList (the catalog of 15 packs)
 *   - FAQPage (the 5-Q FAQ section)
 *
 * The detail route emits one Quiz JSON-LD block (Google's Quiz rich
 * result type). A regression that removes either silently strips the
 * SERP feature — invisible to Lighthouse, devastating to organic
 * discovery.
 *
 * Why a Playwright spec when there's already a unit test (`tests/routes/tests-index.test.tsx`):
 * the unit test verifies the `head()` config builder; what we DON'T
 * verify is that the route actually pipes the result into the SSR
 * HTML. A bug where someone removes `scripts: [...]` from the head()
 * return value compiles + passes unit tests + breaks SEO silently.
 *
 * Runtime caveat (see e2e/specs/composer/seo-jsonld.spec.ts header):
 *   - Production CF Pages: head() runs in SSR worker; JSON-LD ships in
 *     the initial HTML response.
 *   - npm run dev (Vite): head() runs client-side after hydration; we
 *     use page.locator(...) which observes the DOM either way.
 */

interface JsonLdBlob {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

async function readJsonLdBlobs(page: import("@playwright/test").Page): Promise<JsonLdBlob[]> {
  const scripts = page.locator('script[type="application/ld+json"]');
  await scripts.first().waitFor({ state: "attached", timeout: 5_000 });
  const count = await scripts.count();
  const out: JsonLdBlob[] = [];
  for (let i = 0; i < count; i++) {
    const raw = await scripts.nth(i).textContent();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "@type" in parsed) {
        out.push(parsed as JsonLdBlob);
      }
    } catch {
      // ignore malformed blobs — the assertion below will catch missing
      // expected @type entries.
    }
  }
  return out;
}

test.describe("/tests catalog — SEO JSON-LD blobs (TC-14)", () => {
  test.beforeEach(async ({ page }) => {
    await primeConsent(page);
  });

  test("emits ItemList AND FAQPage JSON-LD blobs", async ({ page, testsDirectory }) => {
    await testsDirectory.index.open();
    const blobs = await readJsonLdBlobs(page);
    const types = blobs.map((b) => b["@type"]);
    expect(types).toContain("ItemList");
    expect(types).toContain("FAQPage");
  });

  test("ItemList carries non-empty itemListElement of /tests/<slug> URLs", async ({
    page,
    testsDirectory,
  }) => {
    await testsDirectory.index.open();
    const blobs = await readJsonLdBlobs(page);
    const itemList = blobs.find((b) => b["@type"] === "ItemList");
    expect(itemList).toBeDefined();
    const elements = (itemList as { itemListElement?: Array<{ url?: string }> }).itemListElement;
    expect(Array.isArray(elements)).toBe(true);
    expect(elements!.length).toBeGreaterThan(0);
    for (const el of elements!) {
      expect(el.url).toMatch(/\/tests\/[a-z0-9-]+$/);
    }
  });

  test("FAQPage carries 5 mainEntity Question entries", async ({ page, testsDirectory }) => {
    await testsDirectory.index.open();
    const blobs = await readJsonLdBlobs(page);
    const faq = blobs.find((b) => b["@type"] === "FAQPage");
    expect(faq).toBeDefined();
    const entries = (faq as { mainEntity?: Array<{ "@type"?: string }> }).mainEntity;
    expect(Array.isArray(entries)).toBe(true);
    // The plan / route specifies 5 FAQ entries.
    expect(entries!.length).toBe(5);
    for (const e of entries!) {
      expect(e["@type"]).toBe("Question");
    }
  });
});

test.describe("/tests/$slug — SEO JSON-LD blob (TC-15)", () => {
  test.beforeEach(async ({ page }) => {
    await primeConsent(page);
  });

  test("detail page emits Quiz JSON-LD with pack title + slug-canonical URL", async ({
    page,
    testsDirectory,
  }) => {
    await testsDirectory.pack.open("heslo-2fa");
    const blobs = await readJsonLdBlobs(page);
    const quiz = blobs.find((b) => b["@type"] === "Quiz");
    expect(quiz).toBeDefined();
    const name = (quiz as { name?: string }).name;
    const url = (quiz as { url?: string }).url;
    expect(typeof name).toBe("string");
    expect(name!.length).toBeGreaterThan(0);
    expect(url).toMatch(/\/tests\/heslo-2fa$/);
  });

  test("detail page sets canonical link to the slug URL", async ({ page, testsDirectory }) => {
    await testsDirectory.pack.open("heslo-2fa");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(/\/tests\/heslo-2fa$/);
  });
});
