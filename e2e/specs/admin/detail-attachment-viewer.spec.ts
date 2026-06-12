import type { BrowserContext } from "@playwright/test";

import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { seedSupportTicket, supportTicketTables } from "../../seed";

// E48-v3 — attachment viewer on the admin ticket detail page.
//
// Seeds one ticket + 3 attachment rows (PNG, JPG, PDF) into the Supabase
// mock, then asserts:
//   - image renders via its test-id (first attachment is auto-expanded)
//   - PDF renders via <iframe> embed test-id after expanding its card
//   - filename + download button are present per attachment
//   - clicking an image opens the lightbox; Esc / close button dismiss it
//
// The signed-URL stack is two-step: `request_attachment_signed_url` RPC
// returns Storage metadata, then the client calls Storage `object/sign`.
// The RPC goes through the standard mock; the Storage endpoint + the
// signed object GET are routed below.

const NOW = "2026-05-21T10:00:00.000Z";
const PNG_ID = "aaaa0001-0000-4000-8000-000000000001";
const JPG_ID = "aaaa0002-0000-4000-8000-000000000002";
const PDF_ID = "aaaa0003-0000-4000-8000-000000000003";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

interface AttachmentSeed {
  id: string;
  filename: string;
  mime_type: string;
}

const ATTACHMENTS: AttachmentSeed[] = [
  { id: PNG_ID, filename: "small-image.png", mime_type: "image/png" },
  { id: JPG_ID, filename: "medium-image.jpg", mime_type: "image/jpeg" },
  { id: PDF_ID, filename: "document.pdf", mime_type: "application/pdf" },
];

function attachmentRow(ticketId: string, seed: AttachmentSeed) {
  return {
    id: seed.id,
    ticket_id: ticketId,
    message_id: null,
    filename: seed.filename,
    mime_type: seed.mime_type,
    size_bytes: 12_345,
    scan_status: "clean",
    storage_path: `e2e/${ticketId}/${seed.filename}`,
    created_at: NOW,
  };
}

async function mockStorageSignedUrls(context: BrowserContext): Promise<void> {
  await context.route("**/storage/v1/object/sign/**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signedURL: "/object/sign/support-attachments/e2e-mock?token=e2e" }),
      });
      return;
    }
    const isPdf = request.url().includes("pdf");
    await route.fulfill({
      status: 200,
      contentType: isPdf ? "application/pdf" : "image/png",
      body: isPdf ? Buffer.from("%PDF-1.4\n%%EOF") : TINY_PNG,
    });
  });
}

let ticketId = "";

test.describe("E48-v3 — attachment viewer (admin detail page)", () => {
  test.beforeEach(async ({ context, page }) => {
    const ticket = seedSupportTicket({ subject: "Attachment viewer ticket" });
    ticketId = ticket.id as string;

    await mockStorageSignedUrls(context);
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          ...supportTicketTables([ticket]),
          support_ticket_attachments: ATTACHMENTS.map((a) => attachmentRow(ticketId, a)),
        },
        rpcs: {
          has_role: true,
          request_attachment_signed_url: (body: unknown) => {
            const { p_attachment_id, p_inline } = body as {
              p_attachment_id: string;
              p_inline?: boolean;
            };
            const seed = ATTACHMENTS.find((a) => a.id === p_attachment_id);
            return {
              storage_path: `e2e/${ticketId}/${seed?.filename ?? "unknown"}`,
              filename: seed?.filename ?? "unknown",
              mime_type: seed?.mime_type ?? "application/octet-stream",
              inline: p_inline ?? false,
            };
          },
        },
      },
    });
  });

  test("image attachment renders with its test-id (first card auto-expanded)", async ({
    adminTicketDetail,
  }) => {
    await adminTicketDetail.open(ticketId);
    await expect(adminTicketDetail.attachmentViewerRoot).toBeVisible();
    await expect(adminTicketDetail.attachmentImage(PNG_ID)).toBeVisible();
  });

  test("PDF attachment renders as iframe embed after expanding its card", async ({
    adminTicketDetail,
  }) => {
    await adminTicketDetail.open(ticketId);
    await expect(adminTicketDetail.attachmentViewerRoot).toBeVisible();
    // Only the first attachment is expanded by default — expand the PDF.
    await adminTicketDetail.attachmentToggle(PDF_ID).click();
    await expect(adminTicketDetail.attachmentPdfEmbed(PDF_ID)).toBeVisible();
  });

  test("attachment filename and download button are present", async ({ adminTicketDetail }) => {
    await adminTicketDetail.open(ticketId);
    await expect(adminTicketDetail.attachmentFilename(PNG_ID)).toBeVisible();
    await expect(adminTicketDetail.attachmentFilename(PNG_ID)).toHaveText("small-image.png");
    await expect(adminTicketDetail.attachmentDownloadButton(PNG_ID)).toBeVisible();
  });

  test("clicking an image opens the lightbox", async ({ adminTicketDetail }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.attachmentImage(PNG_ID).click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeVisible();
  });

  test("Esc closes the lightbox", async ({ adminTicketDetail, page }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.attachmentImage(PNG_ID).click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeHidden();
  });

  test("lightbox close button closes the lightbox", async ({ adminTicketDetail }) => {
    await adminTicketDetail.open(ticketId);
    await adminTicketDetail.attachmentImage(PNG_ID).click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeVisible();
    await adminTicketDetail.attachmentLightboxCloseButton.click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeHidden();
  });
});
