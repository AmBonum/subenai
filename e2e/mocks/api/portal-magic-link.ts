import type { Page } from "@playwright/test";

/**
 * Stub `POST /api/portal-magic-link` for browser specs testing the
 * /manage-support form flow (E11.4).
 *
 * Usage:
 *   import { stubPortalMagicLink } from "../../mocks/api/portal-magic-link";
 *
 *   test("TC-04: success state shown after API 200", async ({ page }) => {
 *     await stubPortalMagicLink(page, { status: 200 });
 *     await page.goto("/manage-support");
 *     // ...
 *   });
 */

export type PortalMagicLinkStub =
  | { status: 200; body?: Record<string, unknown> }
  | { status: 429; body: { error: string } }
  | { status: 500; body: { error: string } }
  | { abort: true }
  | { delay: number; status: 200; body?: Record<string, unknown> };

export async function stubPortalMagicLink(page: Page, stub: PortalMagicLinkStub): Promise<void> {
  await page.route("**/api/portal-magic-link**", async (route) => {
    if ("abort" in stub && stub.abort) {
      await route.abort();
      return;
    }
    const delayMs = "delay" in stub ? stub.delay : 0;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const status = "status" in stub ? stub.status : 200;
    const body = "body" in stub && stub.body ? stub.body : {};
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
