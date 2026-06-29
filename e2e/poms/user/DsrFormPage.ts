import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

export class DsrFormPage extends BasePage {
  static readonly PATH = "/app/legal/dsr" as const;

  async open(): Promise<void> {
    await this.goto(DsrFormPage.PATH);
    await this.root.waitFor({ state: "visible" });
  }

  get root(): Locator {
    return this.page.getByTestId("app-legal-dsr-root");
  }

  get formCard(): Locator {
    return this.page.getByTestId("dsr-form-card");
  }

  get emailInput(): Locator {
    return this.page.getByTestId("dsr-form-subject-input");
  }

  get submitButton(): Locator {
    return this.page.getByTestId("dsr-form-submit-button");
  }

  get historyCard(): Locator {
    return this.page.getByTestId("app-legal-dsr-history-card");
  }

  get successBanner(): Locator {
    return this.page.getByTestId("dsr-form-success-banner");
  }

  get errorBanner(): Locator {
    return this.page.getByTestId("dsr-form-error-banner");
  }
}
