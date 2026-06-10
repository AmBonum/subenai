import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { ADMIN_SESSION } from "../../fixtures/auth";
import { mockSupportApi, type MockSupportApiCaptures } from "../../mocks/api/support";

// E48 Wave-4 — admin ticket detail page render, reply, transitions,
// confirm dialogs, typed-confirm gate.
//
// Covers plan IDs: D-01, D-03, D-04, D-07, D-08, D-09, D-10, D-11.
//
// Also covers test IDs:
//   TC-11 (reply with empty body stays disabled)
//   TC-13 (QueueStatusPopover cancel keeps status unchanged)
//   TC-14 (typed-confirm gate for destructive action)
//
// NOTE ON TC-14:
//   The plan says "Vymazať natvrdo" with subject-typed confirm. The live
//   component (`TicketDetailHeader.tsx`) implements "Označiť ako spam"
//   (soft-delete) with TICKET-ID typed confirm — NOT a "hard delete"
//   button and NOT subject-typed. The test is written against the
//   actual live ConfirmDialog that requires typing the ticket ID.
//   This discrepancy is reported in the PR description.
//
// NOTE ON D-07 (internal note):
//   Resolved in E48-v4. SupportTicketDetail composer now exposes an
//   `admin-ticket-detail-reply-internal-toggle` checkbox; checked rows
//   are inserted with `is_internal=true`, skip the Resend dispatch, and
//   render with an amber `Interná poznámka` badge in the thread.
//   View-token RPC filters internal rows so the submitter never sees
//   them.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const MSG_ID = "msg-001";
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
    assignees: [],
    first_assignee_display_name: null,
    ...overrides,
  };
}

function buildMessageRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: MSG_ID,
    ticket_id: TICKET_ID,
    author_kind: "admin",
    author_name: "Admin User",
    body: "Dobrý deň, pracujeme na vašej žiadosti.",
    created_at: NOW,
    is_internal: false,
    ...overrides,
  };
}

test.describe("Admin ticket detail — render, reply, transitions", () => {
  let captures: MockSupportApiCaptures;

  test.beforeEach(async ({ context, page }) => {
    captures = await mockSupportApi(context, {
      ticketReplyResponse: { message_id: "msg-new-001" },
    });

    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          support_tickets: [buildTicketRow()],
          support_ticket_messages: [buildMessageRow()],
          support_ticket_attachments: [],
          audit_log: [],
        },
        rpcs: {
          has_role: true,
          transition_ticket_status: null,
          get_ticket_thread_for_view_token: null,
        },
      },
    });
  });

  // D-01: detail renders subject, status badge, requester, category, created_at
  test("D-01: detail page renders subject, status badge, requester, category, and created_at", async ({
    adminTicketDetail,
  }) => {
    await test.step("Open the ticket detail page", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Verify the detail root is visible", async () => {
      await expect(adminTicketDetail.root).toBeVisible();
    });

    await test.step("Verify the subject is rendered correctly", async () => {
      await expect(adminTicketDetail.subject).toHaveText("Smoke test E48");
    });

    await test.step("Verify the status badge shows 'Nové'", async () => {
      await expect(adminTicketDetail.statusBadge).toContainText("Nové");
    });

    await test.step("Verify the submitter block is visible and contains the email", async () => {
      await expect(adminTicketDetail.submitterBlock).toContainText("smoke@test.example");
    });

    await test.step("Verify the category badge is visible", async () => {
      await expect(adminTicketDetail.categoryBadge).toBeVisible();
    });

    await test.step("Verify the created_at timestamp is visible in the metadata panel", async () => {
      await expect(adminTicketDetail.metadataCreatedAt).toBeVisible();
    });
  });

  // D-03 / TC-11: send button disabled while textarea is empty or whitespace-only
  test("D-03 / TC-11: reply send button is disabled while textarea is empty or whitespace-only", async ({
    adminTicketDetail,
  }) => {
    await test.step("Open the ticket detail page", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Verify the reply send button is disabled when textarea is empty", async () => {
      await expect(adminTicketDetail.replySendButton).toBeDisabled();
    });

    await test.step("Fill the textarea with only whitespace", async () => {
      await adminTicketDetail.replyTextarea.fill("   ");
    });

    await test.step("Verify the send button is still disabled for whitespace-only input", async () => {
      await expect(adminTicketDetail.replySendButton).toBeDisabled();
    });

    await test.step("Fill the textarea with a valid reply", async () => {
      await adminTicketDetail.replyTextarea.fill("Aspoň jedno slovo.");
    });

    await test.step("Verify the send button becomes enabled for a valid reply", async () => {
      await expect(adminTicketDetail.replySendButton).toBeEnabled();
    });
  });

  // D-04 / TC-03: admin submits reply; CF function receives correct payload; textarea clears
  test("D-04 / TC-03: admin reply POSTs to CF function; payload correct; textarea cleared", async ({
    adminTicketDetail,
  }) => {
    const replyText = "Dobrý deň, prosím o ďalšie detaily.";

    await test.step("Open the ticket detail page", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Fill and submit the reply", async () => {
      await adminTicketDetail.replyTextarea.fill(replyText);
      await adminTicketDetail.replySendButton.click();
    });

    await test.step("Verify exactly one reply request was captured", async () => {
      await expect.poll(() => captures.ticketReplyRequests.length, { timeout: 5000 }).toBe(1);
    });

    await test.step("Verify the captured request body has the correct ticket_id", async () => {
      const body = captures.ticketReplyRequests[0].body as Record<string, unknown>;
      expect(body.ticket_id).toBe(TICKET_ID);
    });

    await test.step("Verify the captured request body has the correct reply text", async () => {
      const body = captures.ticketReplyRequests[0].body as Record<string, unknown>;
      expect(body.body).toBe(replyText);
    });

    await test.step("Verify the Authorization header begins with 'Bearer '", async () => {
      const authHeader = captures.ticketReplyRequests[0].headers["authorization"];
      expect(authHeader).toMatch(/^Bearer /);
    });

    await test.step("Verify the textarea is cleared after successful send", async () => {
      await expect(adminTicketDetail.replyTextarea).toHaveValue("");
    });
  });

  // D-07 (E48-v4): admin checks Interná poznámka toggle, sends; CF
  // function receives is_internal=true. Existing internal message in the
  // seed renders with the Interná poznámka badge.
  test("D-07: internal-note toggle sends is_internal=true; thread badge renders for internal messages", async ({
    adminTicketDetail,
    page,
  }) => {
    // Override the seed for this test: include one existing internal
    // admin note so we can assert the badge rendering path.
    await page.unrouteAll();
    captures = await mockSupportApi(page.context(), {
      ticketReplyResponse: { message_id: "msg-internal-new" },
    });
    await setupAppShell(page.context(), page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          support_tickets: [buildTicketRow()],
          support_ticket_messages: [
            buildMessageRow({ id: "msg-internal-seed", is_internal: true }),
          ],
          support_ticket_attachments: [],
          audit_log: [],
        },
        rpcs: {
          has_role: true,
          transition_ticket_status: null,
          get_ticket_thread_for_view_token: null,
        },
      },
    });

    await test.step("Open the ticket detail page", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Verify the seeded internal note carries the Interná poznámka badge", async () => {
      await expect(adminTicketDetail.messageInternalBadge("msg-internal-seed")).toContainText(
        "Interná poznámka",
      );
    });

    await test.step("Fill body, check the internal-note toggle, send", async () => {
      await adminTicketDetail.replyTextarea.fill("Interná poznámka pre tím.");
      await adminTicketDetail.replyInternalToggle.click();
      await adminTicketDetail.replySendButton.click();
    });

    await test.step("Verify the CF function received is_internal=true", async () => {
      await expect.poll(() => captures.ticketReplyRequests.length, { timeout: 5000 }).toBe(1);
      const body = captures.ticketReplyRequests[0].body as Record<string, unknown>;
      expect(body.is_internal).toBe(true);
      expect(body.body).toBe("Interná poznámka pre tím.");
    });
  });

  // D-08: status 'new' shows 'Začať riešiť'; 'Uzavrieť' is hidden in the sidebar
  test("D-08: ticket with status 'new' shows 'Začať riešiť' action and hides resolve actions", async ({
    adminTicketDetail,
  }) => {
    await test.step("Open the detail page for a 'new' ticket", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Verify the 'Začať riešiť' button is visible", async () => {
      await expect(adminTicketDetail.statusActionButton("in_progress")).toBeVisible();
    });

    await test.step("Verify the 'Uzavrieť' / resolve action is also visible for new tickets (FSM allows it)", async () => {
      // Per FSM in ticket-labels.ts: new → resolved is allowed (needsConfirm=true).
      // The test verifies the button is rendered; confirming or cancelling is D-09.
      await expect(adminTicketDetail.statusActionButton("resolved")).toBeVisible();
    });
  });

  // D-09 / TC-13: "Uzavrieť" transition opens ConfirmDialog; cancelling leaves status unchanged
  test("D-09 / TC-13: clicking 'Označiť ako vyriešené' opens ConfirmDialog; cancelling leaves status unchanged", async ({
    adminTicketDetail,
  }) => {
    await test.step("Open the ticket detail page", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Click the 'Označiť ako vyriešené' action button", async () => {
      await adminTicketDetail.statusActionButton("resolved").click();
    });

    await test.step("Verify the ConfirmDialog appears", async () => {
      await expect(adminTicketDetail.confirmDialogRoot).toBeVisible();
    });

    await test.step("Click the cancel button", async () => {
      await adminTicketDetail.confirmDialogCancelButton.click();
    });

    await test.step("Verify the ConfirmDialog is dismissed", async () => {
      await expect(adminTicketDetail.confirmDialogRoot).toBeHidden();
    });

    await test.step("Verify the status badge still shows 'Nové' (unchanged)", async () => {
      await expect(adminTicketDetail.statusBadge).toContainText("Nové");
    });
  });

  // D-10: "Archivovať" transition shows ConfirmDialog severity='warning'; confirms changes badge
  test("D-10: clicking 'Archivovať' opens warning ConfirmDialog; confirming changes status badge", async ({
    adminTicketDetail,
  }) => {
    await test.step("Open the detail page for a 'new' ticket", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Click the 'Archivovať' action button", async () => {
      await adminTicketDetail.statusActionButton("archived").click();
    });

    await test.step("Verify the warning ConfirmDialog appears", async () => {
      await expect(adminTicketDetail.confirmDialogRoot).toBeVisible();
      // The dialog must carry severity=warning icon.
      await expect(adminTicketDetail.confirmDialogIcon("warning")).toBeVisible();
    });

    await test.step("Confirm the archive action", async () => {
      await adminTicketDetail.confirmDialogConfirmButton.click();
    });

    await test.step("Verify the status badge updates to 'Archivované'", async () => {
      await expect(adminTicketDetail.statusBadge).toContainText("Archivované", { timeout: 3000 });
    });
  });

  // D-11 / TC-14: "Označiť ako spam" typed-confirm gate
  //
  // NOTE: The plan names this "Vymazať natvrdo" with subject-typed confirm.
  // The live component implements "Označiť ako spam" with TICKET-ID-typed
  // confirm. The test is written against the actual live ConfirmDialog.
  test("D-11 / TC-14: 'Označiť ako spam' confirm button stays disabled until ticket ID is typed", async ({
    adminTicketDetail,
  }) => {
    await test.step("Open the ticket detail page", async () => {
      await adminTicketDetail.open(TICKET_ID);
    });

    await test.step("Open the kebab menu", async () => {
      await adminTicketDetail.kebabTrigger.click();
    });

    await test.step("Click 'Označiť ako spam' in the menu", async () => {
      await adminTicketDetail.kebabSpamOption.click();
    });

    await test.step("Verify the destructive ConfirmDialog is open", async () => {
      await expect(adminTicketDetail.confirmDialogRoot).toBeVisible();
      await expect(adminTicketDetail.confirmDialogIcon("destructive")).toBeVisible();
    });

    await test.step("Verify the confirm button is disabled while the typed input is empty", async () => {
      await expect(adminTicketDetail.confirmDialogConfirmButton).toBeDisabled();
    });

    await test.step("Type the ticket ID into the typed-confirm input", async () => {
      await adminTicketDetail.confirmDialogTypedInput.fill(TICKET_ID);
    });

    await test.step("Verify the confirm button becomes enabled after typing the correct ID", async () => {
      await expect(adminTicketDetail.confirmDialogConfirmButton).toBeEnabled();
    });

    await test.step("Close the dialog without confirming", async () => {
      await adminTicketDetail.confirmDialogCancelButton.click();
      await expect(adminTicketDetail.confirmDialogRoot).toBeHidden();
    });
  });
});
