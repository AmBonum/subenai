import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { mockSupportApi, type MockSupportApiCaptures } from "../../mocks/api/support";

// E48 smoke test — admin side.
//
// Picks up where kontakt-flow.spec.ts ends: a ticket exists in the DB,
// and now the admin reviews it from /admin/tickets, opens the detail,
// transitions status, and posts a reply. The reply goes through the
// /api/support-ticket-reply CF function (stubbed) and we assert on the
// captured POST body.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-05-21T10:00:00.000Z";

function buildTicketRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TICKET_ID,
    created_at: NOW,
    updated_at: NOW,
    status: "new",
    category: "question",
    source: "public_kontakt",
    subject: "Smoke test E48",
    body: "Toto je smoke test ticket s aspoň dvadsiatimi znakmi.",
    submitter_user_id: null,
    submitter_email: "smoke@test.example",
    submitter_name: "Smoke Tester",
    assigned_to: null,
    archived_at: null,
    deleted_at: null,
    ...overrides,
  };
}

test.describe("E48 smoke — admin queue + detail + reply", () => {
  let captures: MockSupportApiCaptures;

  test.beforeEach(async ({ context, page }) => {
    captures = await mockSupportApi(context, {
      ticketReplyResponse: { message_id: "msg-smoke-001" },
    });

    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          support_tickets: [buildTicketRow()],
          support_ticket_messages: [],
          support_ticket_attachments: [],
        },
        rpcs: {
          // Admins call has_role from RoleGuard middleware.
          has_role: true,
          // FSM transitions go through this RPC. Return null (no error).
          transition_ticket_status: null,
        },
      },
    });
  });

  test("admin queue lists the seeded ticket and navigates to detail", async ({
    adminTicketsQueue,
    adminTicketDetail,
    page,
  }) => {
    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.table).toBeVisible();
    await expect(adminTicketsQueue.row(TICKET_ID)).toBeVisible();

    await adminTicketsQueue.rowLink(TICKET_ID).click();
    await page.waitForURL(new RegExp(`/admin/tickets/${TICKET_ID}$`));

    await expect(adminTicketDetail.root).toBeVisible();
    await expect(adminTicketDetail.subject).toHaveText("Smoke test E48");
    await expect(adminTicketDetail.statusBadge).toContainText("Nové");
    // status=new -> only "Začať riešiť" is shown.
    await expect(adminTicketDetail.startButton).toBeVisible();
    await expect(adminTicketDetail.resolveButton).toBeHidden();
  });

  test("admin reply POSTs to the CF function with subject + body in payload", async ({
    adminTicketDetail,
  }) => {
    await adminTicketDetail.open(TICKET_ID);

    const replyBody = "Dobrý deň, prosím o ďalšie detaily k vašej žiadosti.";
    await adminTicketDetail.sendReply(replyBody);

    // The mock returns 200; the UI flips the composer to "sending" and
    // shows the success toast. We assert on what landed at the CF
    // function side.
    await expect.poll(() => captures.ticketReplyRequests.length).toBe(1);
    const sent = captures.ticketReplyRequests[0].body as Record<string, unknown>;
    expect(sent.ticket_id).toBe(TICKET_ID);
    expect(sent.body).toBe(replyBody);
    // Authorization header should be present (Bearer <jwt>).
    const authHeader = captures.ticketReplyRequests[0].headers["authorization"];
    expect(authHeader).toMatch(/^Bearer /);
  });

  test("rejects a reply when the composer is empty (client-side guard)", async ({
    adminTicketDetail,
  }) => {
    await adminTicketDetail.open(TICKET_ID);
    // Send button is disabled while textarea is empty.
    await expect(adminTicketDetail.replySendButton).toBeDisabled();

    await adminTicketDetail.replyTextarea.fill("   ");
    await expect(adminTicketDetail.replySendButton).toBeDisabled();

    await adminTicketDetail.replyTextarea.fill("Aspoň jedno slovo.");
    await expect(adminTicketDetail.replySendButton).toBeEnabled();
  });
});
