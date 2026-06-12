import type { Page } from "@playwright/test";

export type DonationStatusStub =
  | { status: 404; body?: { status: "not_found" } }
  | { status: 200; body: DonationStatusBody }
  | { status: 500 };

export interface DonationDto {
  amount_eur: number;
  currency: string;
  kind: "oneoff" | "subscription_invoice";
  created_at: string;
  invoice_pdf_url: string | null;
}

export interface DonationStatusBody {
  status: "ready" | "pending" | "unpaid" | "not_found";
  is_subscription?: boolean;
  donation?: DonationDto;
  sponsor_display_name?: string | null;
  has_customer?: boolean;
}

export function makeReadySubscriptionPayload(
  overrides?: Partial<DonationStatusBody>,
): DonationStatusBody {
  return {
    status: "ready",
    is_subscription: true,
    has_customer: true,
    donation: {
      amount_eur: 5,
      currency: "eur",
      kind: "subscription_invoice",
      created_at: "2026-01-15T10:00:00.000Z",
      invoice_pdf_url: null,
    },
    sponsor_display_name: null,
    ...overrides,
  };
}

export async function stubDonationStatus(page: Page, stub: DonationStatusStub): Promise<void> {
  await page.route("**/api/donation-status*", async (route) => {
    if (stub.status === 404) {
      await route.fulfill({
        status: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "not_found" }),
      });
      return;
    }
    if (stub.status === 500) {
      await route.fulfill({
        status: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "internal_server_error" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stub.body),
    });
  });
}
