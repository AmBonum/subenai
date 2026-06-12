import type { BrowserContext } from "@playwright/test";
import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { supportTicketTables } from "../../seed/support-tickets";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// Storage sign + signed-object GET routes — same shape as
// e2e/specs/admin/detail-attachment-viewer.spec.ts.
async function mockStorageSignedUrls(context: BrowserContext): Promise<void> {
  await context.route("**/storage/v1/object/sign/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signedURL: "/object/sign/support-attachments/e2e-mock?token=e2e" }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG });
  });
}

// RPC resolver for the two-step signed-URL stack (E48-v3).
function signedUrlRpc(filename: string) {
  return (body: unknown) => {
    const { p_inline } = body as { p_inline?: boolean };
    return {
      storage_path: `${TICKET_ID}/${filename}`,
      filename,
      mime_type: "image/png",
      inline: p_inline ?? false,
    };
  };
}

// E48 Wave 4 — performance smoke tests (J-01, J-02, J-03).
//
// TC-45 (plan) = J-01: queue with 50 seeded tickets < 2000ms
// TC-46 (plan) = J-02: detail with 20 messages + 10 attachments < 3000ms
// TC-47 (plan) = J-03: image thumbnails have loading="lazy"
//
// Thresholds carry 20% headroom over the plan numbers:
//   J-01: 2000ms plan → 2400ms threshold
//   J-02: 3000ms plan → 3600ms threshold
//
// All data is mocked — no real DB writes. Worker index embedded in comments
// to indicate where real-DB-backed versions would use seedTicketsForQueue.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";

// Build a ticket row in the E48-v3 multi-assign schema — the queue and
// detail read the `support_tickets_with_assignees` VIEW (submitter_*
// columns + `assignees`); `supportTicketTables()` derives both arrays.
function buildTicketRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TICKET_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "new",
    category: "question",
    source: "public_kontakt",
    subject: "Perf smoke ticket",
    body: "Performance smoke ticket body.",
    submitter_user_id: null,
    submitter_email: "perf@e2e.test",
    submitter_name: "Perf User",
    archived_at: null,
    deleted_at: null,
    resolved_at: null,
    assignees: [],
    ...overrides,
  };
}

// Build N minimal ticket rows for the queue performance test.
function buildQueueRows(count: number) {
  return Array.from({ length: count }, (_, i) =>
    buildTicketRow({
      id: `${TICKET_ID.slice(0, -8)}${String(i).padStart(8, "0")}`,
      subject: `[E2E-SEED-W0] perf smoke ticket ${i + 1}`,
      submitter_email: `perf${i}@e2e.test`,
      submitter_name: `Perf User ${i}`,
      body: `Performance smoke ticket body ${i + 1}.`,
      created_at: new Date(Date.now() - i * 60_000).toISOString(),
      updated_at: new Date(Date.now() - i * 60_000).toISOString(),
    }),
  );
}

// Build N message rows for the detail performance test.
function buildMessageRows(count: number) {
  const half = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-perf-${String(i).padStart(4, "0")}`,
    ticket_id: TICKET_ID,
    author_kind: i < half ? "admin" : "submitter",
    body: `Perf smoke message body ${i + 1}. `.repeat(5),
    created_at: new Date(Date.now() - (count - i) * 60_000).toISOString(),
    is_internal: false,
  }));
}

// Build N attachment rows for the detail performance test.
function buildAttachmentRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `att-perf-${String(i).padStart(4, "0")}`,
    ticket_id: TICKET_ID,
    message_id: null,
    filename: `perf-image-${i}.png`,
    mime_type: "image/png",
    size_bytes: 12_345,
    scan_status: "clean" as const,
    storage_path: `${TICKET_ID}/perf-image-${i}.png`,
    created_at: new Date(Date.now() - i * 30_000).toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// TC-45 / J-01: Queue with 50 tickets renders under 2400ms (2000ms + 20% headroom)
// ---------------------------------------------------------------------------

test.describe("TC-45 / J-01: admin queue render performance with 50 tickets", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: supportTicketTables(buildQueueRows(50)),
        rpcs: {
          has_role: true,
        },
      },
    });
  });

  test("TC-45: queue with 50 tickets is visible within 2400ms", async ({
    page,
    adminTicketsQueue,
  }) => {
    let t0 = 0;

    await test.step("Record start time before navigation", async () => {
      t0 = Date.now();
    });

    await test.step("Navigate to the admin ticket queue", async () => {
      await page.goto("/admin/tickets");
    });

    await test.step("Wait for the queue root element to become visible", async () => {
      await adminTicketsQueue.root.waitFor({ state: "visible" });
    });

    await test.step("Assert elapsed time is under 2400ms", async () => {
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeLessThan(2400);
    });

    await test.step("Verify the queue table is rendered with rows", async () => {
      await expect(adminTicketsQueue.table).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// TC-46 / J-02: Detail with 20 messages + 10 attachments renders under 3600ms
// ---------------------------------------------------------------------------

test.describe("TC-46 / J-02: admin detail render performance with 20 messages + 10 attachments", () => {
  test.beforeEach(async ({ context, page }) => {
    await mockStorageSignedUrls(context);
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          ...supportTicketTables([
            buildTicketRow({
              subject: "J-02 performance smoke ticket",
              status: "in_progress",
              submitter_email: "j02-perf@e2e.test",
              body: "J-02 base body.",
            }),
          ]),
          support_ticket_messages: buildMessageRows(20),
          support_ticket_attachments: buildAttachmentRows(10),
        },
        rpcs: {
          has_role: true,
          // Return fake signed URLs for all attachment requests.
          request_attachment_signed_url: signedUrlRpc("perf-image-0.png"),
        },
      },
    });
  });

  test("TC-46: detail with 20 messages + 10 attachments is visible within 3600ms", async ({
    page,
    adminTicketDetail,
  }) => {
    let t0 = 0;

    await test.step("Record start time before navigation", async () => {
      t0 = Date.now();
    });

    await test.step("Navigate to the ticket detail page", async () => {
      await page.goto(`/admin/tickets/${TICKET_ID}`);
    });

    await test.step("Wait for the thread element to become visible", async () => {
      await adminTicketDetail.thread.waitFor({ state: "visible" });
    });

    await test.step("Assert elapsed time is under 3600ms", async () => {
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeLessThan(3600);
    });

    await test.step("Verify root and attachments section are visible", async () => {
      await expect(adminTicketDetail.root).toBeVisible();
      await expect(adminTicketDetail.attachmentViewerRoot).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// TC-47 / J-03: Image thumbnails in the attachment viewer have loading="lazy"
// ---------------------------------------------------------------------------

test.describe("TC-47 / J-03: image thumbnails have loading=lazy", () => {
  const ATTACHMENT_IDS = ["att-lazy-0", "att-lazy-1", "att-lazy-2"];

  test.beforeEach(async ({ context, page }) => {
    await mockStorageSignedUrls(context);
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          ...supportTicketTables([
            buildTicketRow({
              subject: "J-03 lazy loading test",
              submitter_email: "j03@e2e.test",
              submitter_name: "J03 User",
              body: "J-03 base body.",
            }),
          ]),
          // Oldest-first display order — att-lazy-0 renders (and
          // auto-expands) first.
          support_ticket_attachments: ATTACHMENT_IDS.map((id, i) => ({
            id,
            ticket_id: TICKET_ID,
            message_id: null,
            filename: `lazy-image-${i}.png`,
            mime_type: "image/png",
            size_bytes: 12_345,
            scan_status: "clean",
            storage_path: `${TICKET_ID}/lazy-image-${i}.png`,
            created_at: new Date(Date.now() - (ATTACHMENT_IDS.length - i) * 1000).toISOString(),
          })),
        },
        rpcs: {
          has_role: true,
          request_attachment_signed_url: signedUrlRpc("lazy-image-0.png"),
        },
      },
    });
  });

  test("TC-47: every img inside the attachment viewer has loading='lazy'", async ({
    page,
    adminTicketDetail,
  }) => {
    await test.step("Open the ticket detail page with 3 clean image attachments", async () => {
      await adminTicketDetail.open(TICKET_ID);
      await expect(adminTicketDetail.root).toBeVisible();
    });

    await test.step("Wait for the attachments section to be visible", async () => {
      await expect(adminTicketDetail.attachmentViewerRoot).toBeVisible();
      // Only expanded cards render an <img>, and the preview appears
      // after the signed-URL round-trip — wait for the auto-expanded
      // first attachment before snapshotting attributes.
      await expect(adminTicketDetail.attachmentImage(ATTACHMENT_IDS[0])).toBeVisible();
    });

    await test.step("Find all img elements inside admin-ticket-attachment-viewer", async () => {
      // Use evaluate to inspect all img elements inside the attachment section.
      // This cannot live in the spec as a locator chain — the evaluation of
      // attributes across multiple dynamic elements is environment-level.
      const lazyAttrs = await page.evaluate(() => {
        const section = document.querySelector('[data-testid="admin-ticket-attachment-viewer"]');
        if (!section) return [];
        return Array.from(section.querySelectorAll("img")).map((img) =>
          img.getAttribute("loading"),
        );
      });

      // Every img in the section must have loading="lazy".
      expect(lazyAttrs.length).toBeGreaterThan(0);
      for (const attr of lazyAttrs) {
        expect(attr).toBe("lazy");
      }
    });
  });
});
