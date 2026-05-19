import type { Page } from "@playwright/test";

export interface TestSetsStub {
  status: number;
  body: Record<string, unknown>;
}

export async function stubTestSets(page: Page, stub: TestSetsStub): Promise<void> {
  await page.route("**/api/test-sets", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: stub.status,
      contentType: "application/json",
      body: JSON.stringify(stub.body),
    });
  });
}
