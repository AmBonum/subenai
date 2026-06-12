import type { Page } from "@playwright/test";

export type CustomerPortalStub = { status: 200; url: string } | { status: number; error: string };

export async function stubCustomerPortal(page: Page, stub: CustomerPortalStub): Promise<void> {
  await page.route("**/api/customer-portal", async (route) => {
    if (stub.status === 200 && "url" in stub) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: stub.url }),
      });
      return;
    }
    await route.fulfill({
      status: stub.status,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: (stub as { status: number; error: string }).error }),
    });
  });
}
