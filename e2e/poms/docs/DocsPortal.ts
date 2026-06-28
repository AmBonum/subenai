import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * E54 — Docs portal POM. Covers the public hub (/docs), public articles
 * (/docs/<slug>) and the gated app docs (/docs/app/<slug>). Specs MUST go
 * through these getters/methods — never page.locator/getByTestId directly
 * (.claude/CLAUDE.md § Test IDs).
 */
export class DocsPortal extends BasePage {
  async gotoIndex(): Promise<void> {
    await this.goto("/docs");
  }

  async gotoArticle(slug: string): Promise<void> {
    await this.goto(`/docs/${slug}`);
  }

  async gotoAppDoc(slug: string): Promise<void> {
    await this.goto(`/docs/app/${slug}`);
  }

  get indexRoot(): Locator {
    return this.page.getByTestId("docs-index-root");
  }

  get sectionLinks(): Locator {
    return this.page.getByTestId("docs-index-section-link");
  }

  /** App-docs entry — present on the index only for signed-in users. */
  get appLink(): Locator {
    return this.page.getByTestId("docs-index-app-link");
  }

  get articleRoot(): Locator {
    return this.page.getByTestId("docs-article-root");
  }

  get articleTitle(): Locator {
    return this.page.getByTestId("docs-article-title");
  }

  get explainerRoot(): Locator {
    return this.page.getByTestId("docs-explainer-root");
  }

  get explainerTitle(): Locator {
    return this.page.getByTestId("docs-explainer-title");
  }

  /** Stub page — shown for app slugs without dedicated content. */
  get stubRoot(): Locator {
    return this.page.getByTestId("docs-stub-root");
  }
}
