import type { Page } from "@playwright/test";

/**
 * Stub `GET /rest/v1/public_sponsors**` for browser specs that test the
 * /sponsors and /sponsors/all pages without hitting the real Supabase view.
 *
 * Usage:
 *   import { stubPublicSponsors } from "../../mocks/api/public-sponsors";
 *
 *   test("accordion renders five records", async ({ page }) => {
 *     await stubPublicSponsors(page, {
 *       status: 200,
 *       rows: makeSponsorRows(5),
 *     });
 *     await page.goto("/sponsors");
 *     // ...
 *   });
 */

export interface PublicSponsorRow {
  id: string;
  display_name: string;
  display_link: string | null;
  display_message: string | null;
  created_at: string;
  has_refund: boolean;
}

export type PublicSponsorsStub =
  | { status: 200; rows: PublicSponsorRow[] }
  | { status: 500 }
  | { abort: true };

export async function stubPublicSponsors(page: Page, stub: PublicSponsorsStub): Promise<void> {
  await page.route("**public_sponsors**", async (route) => {
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

/**
 * Factory: build N sponsor rows with sensible defaults.
 * Override individual fields per-row via `overrides[i]`.
 */
export function makeSponsorRows(
  count: number,
  overrides?: Partial<PublicSponsorRow>[],
): PublicSponsorRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i + 1}`,
    display_name: `Test Sponsor ${i + 1}`,
    display_link: null,
    display_message: null,
    created_at: new Date(Date.UTC(2026, 3, i + 1, 10, 0, 0)).toISOString(),
    has_refund: false,
    ...(overrides?.[i] ?? {}),
  }));
}
