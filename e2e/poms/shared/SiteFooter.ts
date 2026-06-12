import type { Locator, Page } from "@playwright/test";

export type FooterNavSlug =
  | "test"
  | "testy"
  | "skolenia"
  | "sablony"
  | "skoly"
  | "blog"
  | "o-projekte"
  | "kontakt"
  | "podpora"
  | "sponzori"
  | "zmeny"
  | "privacy"
  | "cookies"
  | "spravovat-podporu";

/**
 * Site footer POM. Every element the spec asserts on has a getter or
 * method here — specs MUST NOT call `page.locator(...)` /
 * `page.getByTestId(...)` directly (per `.claude/CLAUDE.md` § Test IDs).
 *
 * Locator strategy is `data-testid` first, role/name second.
 */
export class SiteFooter {
  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------
  // Structural locators
  // ---------------------------------------------------------------------------

  get root(): Locator {
    return this.page.getByTestId("footer-root");
  }

  // ---------------------------------------------------------------------------
  // Brand block
  // ---------------------------------------------------------------------------

  get logoLink(): Locator {
    return this.page.getByTestId("footer-logo-link");
  }

  get logoImg(): Locator {
    return this.logoLink.locator("img");
  }

  get tagline(): Locator {
    return this.page.getByTestId("footer-tagline");
  }

  get versionLink(): Locator {
    return this.page.getByTestId("footer-version-link");
  }

  get novejsiLink(): Locator {
    return this.page.getByTestId("footer-novejsi-link");
  }

  // ---------------------------------------------------------------------------
  // Navigation columns
  // ---------------------------------------------------------------------------

  get columnObsah(): Locator {
    return this.page.getByTestId("footer-column-obsah");
  }

  get columnObsahHeading(): Locator {
    return this.columnObsah.getByRole("heading", { level: 3 });
  }

  get columnProjekt(): Locator {
    return this.page.getByTestId("footer-column-projekt");
  }

  get columnProjektHeading(): Locator {
    return this.columnProjekt.getByRole("heading", { level: 3 });
  }

  get columnPravne(): Locator {
    return this.page.getByTestId("footer-column-pravne");
  }

  get columnPravneHeading(): Locator {
    return this.columnPravne.getByRole("heading", { level: 3 });
  }

  navLink(slug: FooterNavSlug): Locator {
    return this.page.getByTestId(`footer-nav-link-${slug}`);
  }

  // ---------------------------------------------------------------------------
  // Bottom bar
  // ---------------------------------------------------------------------------

  get copyright(): Locator {
    return this.page.getByTestId("footer-copyright");
  }

  get cookiesButton(): Locator {
    return this.page.getByTestId("footer-cookies-button");
  }

  get lvtestingLink(): Locator {
    return this.page.getByTestId("footer-lvtesting-link");
  }

  // ---------------------------------------------------------------------------
  // Sponsor strip (conditional)
  // ---------------------------------------------------------------------------

  get sponsorStrip(): Locator {
    return this.page.getByTestId("footer-sponsor-strip");
  }

  get sponsorStripHeading(): Locator {
    return this.sponsorStrip.getByRole("heading", { level: 3 });
  }

  sponsorLink(id: string): Locator {
    return this.page.getByTestId(`footer-sponsor-link-${id}`);
  }

  /** Decorative ↗ glyph rendered next to a linked sponsor name. */
  sponsorLinkArrow(id: string): Locator {
    return this.sponsorLink(id).locator("span[aria-hidden='true']");
  }

  get sponsorAllLink(): Locator {
    return this.page.getByTestId("footer-sponsor-all-link");
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  async rootBoundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return this.root.boundingBox();
  }

  /** Return the tagName of the rendered sponsor entry (e.g. "a" or "span"). */
  async sponsorTagName(id: string): Promise<string> {
    return this.sponsorLink(id).evaluate((el) => el.tagName.toLowerCase());
  }

  /** Number of computed grid columns in the footer's main grid block. */
  async gridColumnCount(): Promise<number> {
    return this.root.evaluate((el) => {
      const inner = el.querySelector<HTMLElement>(".grid");
      if (!inner) return 0;
      return window.getComputedStyle(inner).gridTemplateColumns.trim().split(/\s+/).length;
    });
  }

  /** Computed text-align of the footer's main grid block. */
  async gridTextAlign(): Promise<string> {
    return this.root.evaluate((el) => {
      const inner = el.querySelector<HTMLElement>(".grid");
      if (!inner) return "";
      return window.getComputedStyle(inner).textAlign;
    });
  }

  /** True if the footer is rendered as a descendant of the page's <main>. */
  async isInsideMain(): Promise<boolean> {
    return this.root.evaluate((el) => Boolean(el.closest("main")));
  }

  /**
   * Page-wide `contentinfo` ARIA landmark. The footer renders at the
   * root layout level (outside `<main>`), so its implicit contentinfo
   * role is exposed — TC-18 asserts exactly one landmark. POM owns the
   * locator so the spec can assert count without `page.getByRole`.
   */
  get contentInfoLandmark(): Locator {
    return this.page.getByRole("contentinfo");
  }

  /** Whole-text content of the rendered footer (innerText). */
  async innerText(): Promise<string> {
    return this.root.innerText();
  }
}
