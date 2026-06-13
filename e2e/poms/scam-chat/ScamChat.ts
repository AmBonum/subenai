import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

/**
 * E53.9 — POM for the scam-chat widget (floating launcher + Sheet panel)
 * and the full-page /pomocnik route. POM-only locators per CLAUDE.md:
 * specs never call page.getByTestId/getByRole/locator directly.
 *
 * Route interception of /api/scam-chat* is environment, not an element,
 * so it stays in the spec (`page.route`) — `npm run dev` is plain vite and
 * does not serve the Pages Functions, so the gateway responses are mocked
 * at the route layer for deterministic CI.
 */
export class ScamChatPage extends BasePage {
  static readonly POMOCNIK_PATH = "/pomocnik" as const;

  /** Open any host page that mounts the floating launcher. */
  async openHost(path = "/"): Promise<void> {
    await this.goto(path);
  }

  /** Open the dedicated full-page route (no launcher click needed). */
  async openPomocnik(): Promise<void> {
    await this.goto(ScamChatPage.POMOCNIK_PATH);
  }

  // ── launcher + panel chrome ────────────────────────────────────────
  get launcher(): Locator {
    return this.page.getByTestId("scam-chat-launcher");
  }

  get panel(): Locator {
    return this.page.getByTestId("scam-chat-panel");
  }

  get panelTitle(): Locator {
    return this.page.getByTestId("scam-chat-title");
  }

  get closeButton(): Locator {
    return this.page.getByTestId("scam-chat-close");
  }

  get notice(): Locator {
    return this.page.getByTestId("scam-chat-notice");
  }

  get degradedNotice(): Locator {
    return this.page.getByTestId("scam-chat-degraded-notice");
  }

  // ── conversation ───────────────────────────────────────────────────
  get input(): Locator {
    return this.page.getByTestId("scam-chat-input");
  }

  get sendButton(): Locator {
    return this.page.getByTestId("scam-chat-send");
  }

  get triageButton(): Locator {
    return this.page.getByTestId("scam-chat-triage");
  }

  get messages(): Locator {
    return this.page.getByTestId("scam-chat-messages");
  }

  get userMessages(): Locator {
    return this.page.getByTestId("scam-chat-message-user");
  }

  get assistantMessages(): Locator {
    return this.page.getByTestId("scam-chat-message-assistant");
  }

  /** The most recent assistant bubble. */
  get lastAssistantMessage(): Locator {
    return this.assistantMessages.last();
  }

  get errorAlert(): Locator {
    return this.page.getByTestId("scam-chat-error");
  }

  // ── triage result ──────────────────────────────────────────────────
  get triageResult(): Locator {
    return this.page.getByTestId("scam-chat-triage-result");
  }

  get triageRisk(): Locator {
    return this.page.getByTestId("scam-chat-triage-risk");
  }

  get downloadPdfButton(): Locator {
    return this.page.getByTestId("scam-chat-download-pdf");
  }

  // ── photos ─────────────────────────────────────────────────────────
  get photoAddButton(): Locator {
    return this.page.getByTestId("scam-chat-photo-add");
  }

  get photoInput(): Locator {
    return this.page.getByTestId("scam-chat-photo-input");
  }

  get photoThumbs(): Locator {
    return this.page.getByTestId("scam-chat-photo-thumb");
  }

  get photoError(): Locator {
    return this.page.getByTestId("scam-chat-photo-error");
  }

  // ── quota / fail-closed ────────────────────────────────────────────
  get quotaState(): Locator {
    return this.page.getByTestId("scam-chat-quota");
  }

  get quotaMessage(): Locator {
    return this.page.getByTestId("scam-chat-quota-message");
  }

  // ── actions ────────────────────────────────────────────────────────
  async openFromLauncher(): Promise<void> {
    await this.launcher.click();
    await this.panel.waitFor({ state: "visible" });
  }

  async type(text: string): Promise<void> {
    await this.input.fill(text);
  }

  async send(text: string): Promise<void> {
    await this.input.fill(text);
    await this.sendButton.click();
  }

  async sendTriage(text: string): Promise<void> {
    await this.input.fill(text);
    await this.triageButton.click();
  }
}
