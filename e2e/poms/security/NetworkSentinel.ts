import type { Page, Request } from "@playwright/test";

/**
 * NetworkSentinel — captures every outbound network request from the
 * browser context so a spec can later assert which third-party domains
 * (if any) were contacted during a user journey.
 *
 * Usage: instantiate in the `sentinel` fixture once per test (attaches
 * the `page.on("request")` listener before any navigation), then read
 * `outboundDomains()`, `cookieNames()`, `localStorageKeys()` after the
 * journey completes.
 *
 * The `FIRST_PARTY` heuristic excludes the local dev host + the
 * production subenai.sk so the assertion focuses on **third-party** leaks.
 *
 * Locators only — no `page.locator(...)` calls leak into specs per the
 * CLAUDE.md POM-only rule. Page-level actions (`page.goto`, `page.evaluate`)
 * remain in the spec because they are environment, not elements.
 */
export class NetworkSentinel {
  private readonly contactedHosts = new Set<string>();
  private readonly contactedUrls: string[] = [];

  constructor(private readonly page: Page) {
    this.page.on("request", (request: Request) => this.recordRequest(request));
  }

  private recordRequest(request: Request): void {
    try {
      const url = new URL(request.url());
      // Skip non-network schemes (data:, blob:, about:, etc.)
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      this.contactedHosts.add(url.hostname);
      this.contactedUrls.push(`${request.method()} ${request.url()}`);
    } catch {
      // Malformed URL — record raw for debugging.
      this.contactedUrls.push(`(malformed) ${request.url()}`);
    }
  }

  /**
   * All hostnames contacted since the sentinel attached. Includes
   * first-party + third-party.
   */
  hosts(): string[] {
    return Array.from(this.contactedHosts).sort();
  }

  /**
   * Hostnames contacted that are NOT first-party. First-party = the
   * dev / preview / production origin of subenai itself.
   */
  thirdPartyHosts(): string[] {
    return this.hosts().filter((host) => !NetworkSentinel.isFirstParty(host));
  }

  /** Every request line `METHOD URL` since the sentinel attached. */
  requests(): string[] {
    return [...this.contactedUrls];
  }

  /** Browser-side cookie names visible to the page at call time. */
  async cookieNames(): Promise<string[]> {
    const cookies = await this.page.context().cookies();
    return cookies.map((c) => c.name).sort();
  }

  /** localStorage keys visible to the page at call time. */
  async localStorageKeys(): Promise<string[]> {
    return this.page.evaluate(() => {
      const out: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key !== null) out.push(key);
      }
      return out.sort();
    });
  }

  /** Reset the captured state (rarely needed — fresh fixture per test). */
  clear(): void {
    this.contactedHosts.clear();
    this.contactedUrls.length = 0;
  }

  /**
   * First-party hostnames: anything that resolves to subenai's own
   * surfaces. localhost / 127.0.0.1 cover dev; *.pages.dev covers
   * Cloudflare preview deploys; subenai.sk + *.subenai.sk cover prod.
   */
  static isFirstParty(host: string): boolean {
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "subenai.sk") return true;
    if (host.endsWith(".subenai.sk")) return true;
    if (host.endsWith(".pages.dev")) return true;
    return false;
  }
}
