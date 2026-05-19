import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * Marketing homepage POM (`/`).
 *
 * Covers every element asserted on in `e2e/specs/marketing/home.spec.ts`.
 * Distinct from `e2e/poms/quiz/HomePage.ts`, which only exposes the quiz
 * entry-point CTA and is wired into the quiz-flow fixture suite.
 */
export class MarketingHomePage extends BasePage {
  static readonly PATH = "/" as const;

  // ---------------------------------------------------------------------------
  // Hero section
  // ---------------------------------------------------------------------------

  get heroHeading(): Locator {
    return this.page.getByTestId("home-hero-heading");
  }

  get heroCta(): Locator {
    return this.page.getByTestId("home-hero-cta");
  }

  get heroTagline(): Locator {
    return this.page.getByTestId("home-hero-tagline");
  }

  get statsPill(): Locator {
    return this.page.getByTestId("home-stats-pill");
  }

  // ---------------------------------------------------------------------------
  // Feature cards
  // ---------------------------------------------------------------------------

  get featureCardTesty(): Locator {
    return this.page.getByTestId("home-feature-card-testy");
  }

  get featureCardSkolenia(): Locator {
    return this.page.getByTestId("home-feature-card-skolenia");
  }

  get featureCardAbout(): Locator {
    return this.page.getByTestId("home-feature-card-about");
  }

  // ---------------------------------------------------------------------------
  // Mission / sponsorship block
  // ---------------------------------------------------------------------------

  get missionCtaSupport(): Locator {
    return this.page.getByTestId("home-mission-cta-support");
  }

  get missionCtaMore(): Locator {
    return this.page.getByTestId("home-mission-cta-more");
  }

  // ---------------------------------------------------------------------------
  // Sponsors block
  // ---------------------------------------------------------------------------

  get sponsorsCta(): Locator {
    return this.page.getByTestId("home-sponsors-cta");
  }

  // ---------------------------------------------------------------------------
  // Slogan image
  // ---------------------------------------------------------------------------

  get sloganSection(): Locator {
    return this.page.getByTestId("home-slogan-section");
  }

  get sloganImage(): Locator {
    return this.page.getByTestId("home-slogan-image");
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async open(): Promise<void> {
    await this.goto(MarketingHomePage.PATH);
  }

  async scrollToMission(): Promise<void> {
    await this.missionCtaSupport.scrollIntoViewIfNeeded();
  }

  async scrollToSponsors(): Promise<void> {
    await this.sponsorsCta.scrollIntoViewIfNeeded();
  }

  // ---------------------------------------------------------------------------
  // Computed-state helpers (return values, never assertions)
  // ---------------------------------------------------------------------------

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }

  async sloganImageNaturalWidth(): Promise<number> {
    return this.sloganImage.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  }

  async featureCardBoundingBox(
    slug: "testy" | "skolenia" | "about",
  ): Promise<{ x: number; width: number } | null> {
    const locator = this.page.getByTestId(`home-feature-card-${slug}`);
    const box = await locator.boundingBox();
    if (!box) return null;
    return { x: box.x, width: box.width };
  }
}
