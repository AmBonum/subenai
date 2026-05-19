import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export type TopicSlug = "tech" | "content" | "sponsor" | "gdpr" | "press" | "other";

/**
 * Contact page POM (`/contact`).
 *
 * Covers every element asserted on in `e2e/specs/marketing/contact.spec.ts`.
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
  // Main email section
  // ---------------------------------------------------------------------------

  get mainEmailLink(): Locator {
    return this.page.getByTestId("contact-main-email-link");
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

  get gdprEmailLink(): Locator {
    return this.page.getByTestId("contact-gdpr-email-link");
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
    return this.page.evaluate(
      (prop) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute("content") ?? null,
      property,
    );
  }

  /**
   * Returns the decoded `subject` query parameter from a mailto href string.
   * Returns null if the href is not a mailto with a subject param.
   */
  decodeMailtoSubject(href: string): string | null {
    const qmark = href.indexOf("?");
    if (qmark === -1) return null;
    const params = new URLSearchParams(href.slice(qmark + 1));
    const raw = params.get("subject");
    if (raw === null) return null;
    return decodeURIComponent(raw);
  }

  /**
   * Collects all six topic link hrefs from the DOM and returns them
   * as an array of decoded subject strings.
   */
  async allTopicSubjects(): Promise<string[]> {
    const slugs: TopicSlug[] = ["tech", "content", "sponsor", "gdpr", "press", "other"];
    const subjects: string[] = [];
    for (const slug of slugs) {
      const href = await this.topicLink(slug).getAttribute("href");
      if (!href) continue;
      const subject = this.decodeMailtoSubject(href);
      if (subject !== null) subjects.push(subject);
    }
    return subjects;
  }

  /** Returns the computed grid-template-columns for the topics list ul. */
  async topicsGridColumns(): Promise<number> {
    return this.topicsList.evaluate((el) => {
      const cols = window.getComputedStyle(el).gridTemplateColumns;
      return cols.trim().split(/\s+/).length;
    });
  }
}
