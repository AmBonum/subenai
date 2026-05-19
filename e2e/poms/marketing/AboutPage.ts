import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * About page POM (`/about`).
 *
 * Covers every element asserted on in `e2e/specs/marketing/about.spec.ts`.
 */
export class AboutPage extends BasePage {
  static readonly PATH = "/about" as const;

  // ---------------------------------------------------------------------------
  // Page header
  // ---------------------------------------------------------------------------

  get heading(): Locator {
    return this.page.getByTestId("about-heading");
  }

  get tagline(): Locator {
    return this.page.getByTestId("about-tagline");
  }

  get backHomeLink(): Locator {
    return this.page.getByTestId("about-back-home");
  }

  // ---------------------------------------------------------------------------
  // Content sections (by section data-testid)
  // ---------------------------------------------------------------------------

  get sectionCiel(): Locator {
    return this.page.getByTestId("about-section-ciel");
  }

  get sectionBezplatne(): Locator {
    return this.page.getByTestId("about-section-bezplatne");
  }

  get sectionSponsorship(): Locator {
    return this.page.getByTestId("about-section-sponsorship");
  }

  get sectionMoney(): Locator {
    return this.page.getByTestId("about-section-money");
  }

  get sectionSponsors(): Locator {
    return this.page.getByTestId("about-section-sponsors");
  }

  get sectionLimits(): Locator {
    return this.page.getByTestId("about-section-limits");
  }

  get sectionSupport(): Locator {
    return this.page.getByTestId("about-section-support");
  }

  // ---------------------------------------------------------------------------
  // CTA links in the support section
  // ---------------------------------------------------------------------------

  get supportCtaPrimary(): Locator {
    return this.page.getByTestId("about-support-cta-primary");
  }

  get supportCtaSecondary(): Locator {
    return this.page.getByTestId("about-support-cta-secondary");
  }

  // ---------------------------------------------------------------------------
  // In-text links
  // ---------------------------------------------------------------------------

  get cookiesLink(): Locator {
    return this.page.getByTestId("about-cookies-link");
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async open(): Promise<void> {
    await this.goto(AboutPage.PATH);
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }

  async canonicalHref(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    );
  }

  async robotsContent(): Promise<string | null> {
    return this.page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
  }

  async sectionHeadingText(id: string): Promise<string | null> {
    return this.page.evaluate((headingId) => {
      const el = document.getElementById(headingId);
      return el?.textContent?.trim() ?? null;
    }, id);
  }

  /**
   * Returns the parsed JSON from the first JSON-LD script tag that contains
   * a node with `"@type": "AboutPage"`. Returns null if none found.
   */
  async aboutPageJsonLd(): Promise<Record<string, unknown> | null> {
    return this.page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        try {
          const parsed = JSON.parse(script.textContent ?? "");
          if (parsed["@type"] === "AboutPage") return parsed;
          if (Array.isArray(parsed["@graph"])) {
            const node = (parsed["@graph"] as Array<Record<string, unknown>>).find(
              (n) => n["@type"] === "AboutPage",
            );
            if (node) return node;
          }
        } catch {
          // skip malformed
        }
      }
      return null;
    });
  }

  /**
   * Collects network requests to Google Tag Manager / GA that fire while
   * the page loads. Call BEFORE navigating to set up the listener.
   */
  collectAnalyticsRequests(): { urls: string[] } {
    const captured: string[] = [];
    this.page.on("request", (req) => {
      const url = req.url();
      if (url.includes("googletagmanager.com") || url.includes("google-analytics.com")) {
        captured.push(url);
      }
    });
    return { urls: captured };
  }
}
