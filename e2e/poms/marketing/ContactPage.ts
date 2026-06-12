import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export type TopicSlug = "tech" | "content" | "sponsor" | "gdpr" | "press" | "other";

export const TOPIC_SLUGS: readonly TopicSlug[] = [
  "tech",
  "content",
  "sponsor",
  "gdpr",
  "press",
  "other",
] as const;

/**
 * Contact hub page POM (`/contact`).
 *
 * Since the E48 ticketing rework the page routes everything to the web
 * form at `/contact-form` (main CTA + six topic deep-links carrying
 * `?topic=<slug>`); the e-mail address remains only as a plain-text
 * fallback. Covers every element asserted on in
 * `e2e/specs/marketing/contact.spec.ts`.
 */
export class ContactPage extends BasePage {
  static readonly PATH = "/contact" as const;

  // ---------------------------------------------------------------------------
  // Page structure
  // ---------------------------------------------------------------------------

  get root(): Locator {
    return this.page.getByTestId("contact-page-root");
  }

  get backLink(): Locator {
    return this.page.getByTestId("contact-back-link");
  }

  get heading(): Locator {
    return this.page.getByTestId("contact-heading");
  }

  // ---------------------------------------------------------------------------
  // Main form CTA section
  // ---------------------------------------------------------------------------

  get mainFormLink(): Locator {
    return this.page.getByTestId("contact-main-form-link");
  }

  get emailFallback(): Locator {
    return this.page.getByTestId("contact-email-fallback");
  }

  // ---------------------------------------------------------------------------
  // Topics list
  // ---------------------------------------------------------------------------

  get topicsList(): Locator {
    return this.page.getByTestId("contact-topics-list");
  }

  topicLink(slug: TopicSlug): Locator {
    return this.page.getByTestId(`contact-topic-link-${slug}`);
  }

  // ---------------------------------------------------------------------------
  // Operator card
  // ---------------------------------------------------------------------------

  get operatorCard(): Locator {
    return this.page.getByTestId("contact-operator-card");
  }

  get privacyLink(): Locator {
    return this.page.getByTestId("contact-privacy-link");
  }

  get gdprEmailCode(): Locator {
    return this.page.getByTestId("contact-gdpr-email-code");
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async open(): Promise<void> {
    await this.goto(ContactPage.PATH);
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

  async metaDescriptionContent(): Promise<string | null> {
    return this.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('meta[name="description"]'));
      const last = all[all.length - 1];
      return last?.getAttribute("content") ?? null;
    });
  }

  async ogMetaContent(property: string): Promise<string | null> {
    // Route-level og:* tags are appended after the root defaults — take
    // the last match, mirroring metaDescriptionContent.
    return this.page.evaluate((prop) => {
      const all = Array.from(document.querySelectorAll(`meta[property="${prop}"]`));
      return all[all.length - 1]?.getAttribute("content") ?? null;
    }, property);
  }

  /** Collects all six topic link hrefs keyed by slug. */
  async allTopicHrefs(): Promise<Record<TopicSlug, string | null>> {
    const entries: Array<[TopicSlug, string | null]> = [];
    for (const slug of TOPIC_SLUGS) {
      entries.push([slug, await this.topicLink(slug).getAttribute("href")]);
    }
    return Object.fromEntries(entries) as Record<TopicSlug, string | null>;
  }

  /** Returns the computed grid-template-columns for the topics list ul. */
  async topicsGridColumns(): Promise<number> {
    return this.topicsList.evaluate((el) => {
      const cols = window.getComputedStyle(el).gridTemplateColumns;
      return cols.trim().split(/\s+/).length;
    });
  }
}
