import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export type PricingPlanId = "free" | "start" | "firma" | "firma_plus" | "custom";
export type PaidPlanId = "start" | "firma" | "firma_plus";

/** Pricing page POM (`/cennik`). */
export class PricingPage extends BasePage {
  static readonly PATH = "/cennik" as const;

  get title(): Locator {
    return this.page.getByTestId("pricing-title");
  }

  get checkoutCancelledBanner(): Locator {
    return this.page.getByTestId("pricing-checkout-cancelled");
  }

  planCard(id: PricingPlanId): Locator {
    return this.page.getByTestId(`billing-plan-card-${id}`);
  }

  planPrice(id: PaidPlanId): Locator {
    return this.page.getByTestId(`billing-plan-card-${id}-price`);
  }

  planBadge(id: PaidPlanId): Locator {
    return this.page.getByTestId(`billing-plan-card-${id}-badge`);
  }

  planCta(id: PaidPlanId): Locator {
    return this.page.getByTestId(`billing-plan-card-${id}-cta`);
  }

  async open(search = ""): Promise<void> {
    await this.goto(`${PricingPage.PATH}${search}`);
  }

  async hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
