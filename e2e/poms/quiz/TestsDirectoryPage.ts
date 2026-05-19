import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class TestsIndexPage extends BasePage {
  static readonly PATH = "/tests" as const;

  get heading(): Locator {
    return this.page.getByTestId("tests-catalog-heading");
  }

  get intro(): Locator {
    return this.page.getByTestId("tests-catalog-intro");
  }

  get grid(): Locator {
    return this.page.getByTestId("tests-catalog-grid");
  }

  packCards(): Locator {
    return this.grid.locator(":scope > [data-testid^='tests-catalog-card-']");
  }

  packCard(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-${slug}`);
  }

  packCardTitle(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-title-${slug}`);
  }

  packCardMeta(slug: string): Locator {
    return this.page.getByTestId(`tests-catalog-card-meta-${slug}`);
  }

  async open(): Promise<void> {
    await this.goto(TestsIndexPage.PATH);
  }

  async clickPackCard(slug: string): Promise<void> {
    await this.packCard(slug).click();
  }
}

export class TestPackLandingPage extends BasePage {
  static path(slug: string): string {
    return `/tests/${slug}`;
  }

  get heading(): Locator {
    return this.page.getByTestId("test-pack-heading");
  }

  get tagline(): Locator {
    return this.page.getByTestId("test-pack-tagline");
  }

  get meta(): Locator {
    return this.page.getByTestId("test-pack-meta");
  }

  get startButton(): Locator {
    return this.page.getByTestId("test-pack-start-button");
  }

  async open(slug: string): Promise<void> {
    await this.goto(TestPackLandingPage.path(slug));
  }
}

export class TestsDirectoryPage {
  readonly index: TestsIndexPage;
  readonly pack: TestPackLandingPage;

  constructor(page: Page) {
    this.index = new TestsIndexPage(page);
    this.pack = new TestPackLandingPage(page);
  }
}
