import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import {
  seedTickets,
  seedAttachmentFiles,
  cleanupSeeds,
  cleanupSeedAttachmentFiles,
  type AttachmentFixture,
} from "../../../tests/fixtures/seed-tickets";

// E48-v3 — attachment viewer on the admin ticket detail page.
//
// Seeds one ticket + 4 attachments (PNG, JPG, PDF x2) per worker, then
// asserts:
//   - image renders via <img> test-id
//   - PDF renders via <iframe> embed test-id
//   - clicking an image opens the lightbox
//   - Esc closes the lightbox
//   - download button is present per attachment
//
// These specs require SUPABASE_SERVICE_ROLE_KEY + seed env vars.
// Set E2E_ALLOW_NONLOCAL_SEED=1 to run against production.

const WORKER = Number(process.env.TEST_WORKER_INDEX ?? 0);

let ticketIds: string[] = [];
let attachments: AttachmentFixture[] = [];

test.beforeAll(async () => {
  ticketIds = await seedTickets(WORKER);
  attachments = await seedAttachmentFiles(WORKER, [ticketIds[0]]);
});

test.afterAll(async () => {
  await cleanupSeedAttachmentFiles(WORKER);
  await cleanupSeeds(WORKER);
});

test.describe("E48-v3 — attachment viewer (admin detail page)", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        rpcs: {
          has_role: true,
          request_attachment_signed_url: (body: unknown) => {
            const id = (body as Record<string, string>).p_attachment_id;
            return {
              url: `https://example.com/signed/${id}`,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            };
          },
        },
      },
    });
  });

  test("image attachment renders as <img> with correct test-id", async ({ adminTicketDetail }) => {
    const imageAttachment = attachments.find((a) => a.mimeType === "image/png");
    if (!imageAttachment) test.skip();
    await adminTicketDetail.open(ticketIds[0]);
    await expect(adminTicketDetail.attachmentViewerRoot).toBeVisible();
    await expect(adminTicketDetail.attachmentImage(imageAttachment!.attachmentId)).toBeVisible();
  });

  test("PDF attachment renders as iframe embed", async ({ adminTicketDetail }) => {
    const pdfAttachment = attachments.find((a) => a.mimeType === "application/pdf");
    if (!pdfAttachment) test.skip();
    await adminTicketDetail.open(ticketIds[0]);
    await expect(adminTicketDetail.attachmentPdfEmbed(pdfAttachment!.attachmentId)).toBeVisible();
  });

  test("attachment filename and download button are present", async ({ adminTicketDetail }) => {
    const att = attachments[0];
    if (!att) test.skip();
    await adminTicketDetail.open(ticketIds[0]);
    await expect(adminTicketDetail.attachmentFilename(att.attachmentId)).toBeVisible();
    await expect(adminTicketDetail.attachmentDownloadButton(att.attachmentId)).toBeVisible();
  });

  test("clicking an image opens the lightbox", async ({ adminTicketDetail }) => {
    const imageAttachment = attachments.find((a) => a.mimeType === "image/png");
    if (!imageAttachment) test.skip();
    await adminTicketDetail.open(ticketIds[0]);
    await adminTicketDetail.attachmentImage(imageAttachment!.attachmentId).click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeVisible();
  });

  test("Esc closes the lightbox", async ({ adminTicketDetail, page }) => {
    const imageAttachment = attachments.find((a) => a.mimeType === "image/png");
    if (!imageAttachment) test.skip();
    await adminTicketDetail.open(ticketIds[0]);
    await adminTicketDetail.attachmentImage(imageAttachment!.attachmentId).click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeHidden();
  });

  test("lightbox close button closes the lightbox", async ({ adminTicketDetail }) => {
    const imageAttachment = attachments.find((a) => a.mimeType === "image/png");
    if (!imageAttachment) test.skip();
    await adminTicketDetail.open(ticketIds[0]);
    await adminTicketDetail.attachmentImage(imageAttachment!.attachmentId).click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeVisible();
    await adminTicketDetail.attachmentLightboxCloseButton.click();
    await expect(adminTicketDetail.attachmentLightboxRoot).toBeHidden();
  });
});
