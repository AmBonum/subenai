import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

/** Public evidence-report verification POM (`/overenie/$reportId`). */
export class EvidenceVerifyPage extends BasePage {
  get valid(): Locator {
    return this.page.getByTestId("verify-valid");
  }

  get invalid(): Locator {
    return this.page.getByTestId("verify-invalid");
  }

  get error(): Locator {
    return this.page.getByTestId("verify-error");
  }

  get org(): Locator {
    return this.page.getByTestId("verify-org");
  }

  get hash(): Locator {
    return this.page.getByTestId("verify-hash");
  }

  async open(reportId: string): Promise<void> {
    await this.goto(`/overenie/${reportId}`);
  }
}
