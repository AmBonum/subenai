import type { Page } from "@playwright/test";

export type DpaRequestStub =
  | { status: 200; body: DpaRequestSuccessBody }
  | { status: number; body?: { error?: string } };

export interface DpaRequestSuccessBody {
  ok: true;
  requestId: string;
  fileName: string;
  templateVersion: string;
  generatedAt: string;
}

export function makeDpaRequestSuccess(
  overrides?: Partial<DpaRequestSuccessBody>,
): DpaRequestSuccessBody {
  return {
    ok: true,
    requestId: "req-test-001",
    fileName: "dpa-test.pdf",
    templateVersion: "1.0",
    generatedAt: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

export async function stubDpaRequest(page: Page, stub: DpaRequestStub): Promise<void> {
  await page.route("**/api/dpa-request", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: stub.status,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stub.body ?? { error: "internal_server_error" }),
    });
  });
}
