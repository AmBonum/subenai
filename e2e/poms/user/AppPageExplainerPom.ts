import type { Page, Locator } from "@playwright/test";

/**
 * POM for <AppPageExplainer> — the collapsible info panel that ships
 * under <PageHeader> on every /app/* menu route (E48).
 *
 * Composable, not extending a specific app page POM, so any /app spec
 * can construct it alongside its own page POM:
 *
 *   const dash = new AppDashboardPage(page);
 *   const explainer = new AppPageExplainerPom(page);
 *   await dash.open();
 *   await expect(explainer.root).toBeVisible();
 *
 * The same element test-ids are emitted on every page (the component is
 * identical — only the i18n pageKey changes), so a single POM serves
 * all 11 /app menu pages.
 */
export class AppPageExplainerPom {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.getByTestId("app-explainer-root");
  }

  get toggle(): Locator {
    return this.page.getByTestId("app-explainer-toggle");
  }

  get title(): Locator {
    return this.page.getByTestId("app-explainer-title");
  }

  get body(): Locator {
    return this.page.getByTestId("app-explainer-body");
  }

  get lead(): Locator {
    return this.page.getByTestId("app-explainer-lead");
  }

  get sectionConfigure(): Locator {
    return this.page.getByTestId("app-explainer-section-configure");
  }

  get sectionTime(): Locator {
    return this.page.getByTestId("app-explainer-section-time");
  }

  get sectionPitfalls(): Locator {
    return this.page.getByTestId("app-explainer-section-pitfalls");
  }

  get docsHeading(): Locator {
    return this.page.getByTestId("app-explainer-docs-heading");
  }

  docLink(i: number): Locator {
    return this.page.getByTestId(`app-explainer-doc-link-${i}`);
  }

  /**
   * Read the trigger's `aria-expanded` attribute. Radix Collapsible
   * wires this to the open state, so it's the canonical signal —
   * checking body visibility is racy during the open/close animation.
   */
  async isExpanded(): Promise<boolean> {
    return (await this.toggle.getAttribute("aria-expanded")) === "true";
  }

  /** Click the trigger only if currently collapsed. Idempotent. */
  async expand(): Promise<void> {
    if (!(await this.isExpanded())) {
      await this.toggle.click();
    }
  }

  /** Click the trigger only if currently expanded. Idempotent. */
  async collapse(): Promise<void> {
    if (await this.isExpanded()) {
      await this.toggle.click();
    }
  }
}
