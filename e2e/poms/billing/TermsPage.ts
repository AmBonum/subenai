import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export type TermsSectionId =
  | "uvod"
  | "predmet"
  | "objednavka"
  | "cena"
  | "trvanie"
  | "odstupenie"
  | "reklamacie"
  | "zodpovednost"
  | "zaver";

/** Terms of sale POM (`/obchodne-podmienky`). */
export class TermsPage extends BasePage {
  static readonly PATH = "/obchodne-podmienky" as const;

  get heading(): Locator {
    return this.page.getByTestId("terms-heading");
  }

  get effective(): Locator {
    return this.page.getByTestId("terms-effective");
  }

  get backLink(): Locator {
    return this.page.getByTestId("terms-back-link");
  }

  get main(): Locator {
    return this.page.getByTestId("terms-main");
  }

  section(id: TermsSectionId): Locator {
    return this.page.getByTestId(`terms-section-${id}`);
  }

  /** Every section's h2, in DOM order. */
  get sectionHeadings(): Locator {
    return this.page.locator("[data-testid^='terms-section-'] > h2");
  }

  async open(): Promise<void> {
    await this.goto(TermsPage.PATH);
  }

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
