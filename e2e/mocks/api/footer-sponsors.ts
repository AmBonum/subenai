import type { Page } from "@playwright/test";

/**
 * Stub `GET /rest/v1/footer_sponsors` for browser specs that don't want
 * to hit the real Supabase view (e.g. testing sponsor-strip rendering,
 * error degradation, or ad-blocker abort).
 *
 * Usage:
 *   import { stubFooterSponsors } from "../../mocks/api/footer-sponsors";
 *
 *   test("sponsor strip renders rows", async ({ page }) => {
 *     await stubFooterSponsors(page, {
 *       status: 200,
 *       rows: [
 *         { id: "a", display_name: "Acme Corp", display_link: "https://acme.example" },
 *         { id: "b", display_name: "Plain Donor", display_link: null },
 *       ],
 *     });
 *     await page.goto("/");
 *     // ...
 *   });
 */
export interface FooterSponsor {
  id: string;
  display_name: string;
  display_link: string | null;
}

export type FooterSponsorsStub =
  { status: 200; rows: FooterSponsor[] } | { status: 500 } | { abort: true };

export async function stubFooterSponsors(page: Page, stub: FooterSponsorsStub): Promise<void> {
  await page.route("**/rest/v1/footer_sponsors*", async (route) => {
    if ("abort" in stub && stub.abort) {
      await route.abort();
      return;
    }
    if ("status" in stub && stub.status === 500) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal Server Error" }),
      });
      return;
    }
    if ("rows" in stub) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(stub.rows),
      });
    }
  });
}
