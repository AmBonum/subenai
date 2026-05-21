import { test, expect } from "../../../fixtures/base";
import { setupAppShell } from "../../../setup/app-shell";
import { ADMIN_SESSION } from "../../../fixtures/auth";

// E48 security — stored XSS payload rendering on the admin side.
// Traces TC-36, TC-37, TC-39 from specs/support/E48-security.md.
//
// React auto-escapes children, so the assertion is "no dialog fires"
// and "the literal markup appears as text content". A regression that
// reaches for dangerouslySetInnerHTML would surface as a real alert()
// firing — Playwright would either auto-dismiss the dialog or block
// the page on the second one.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-05-21T10:00:00.000Z";
const XSS_SUBJECT = "<script>alert(1)</script>";
const XSS_BODY =
  '<img src=x onerror=alert(2)> <a href="javascript:alert(3)">link</a> <iframe src="data:text/html,<script>alert(4)</script>"></iframe>';

function xssTicket(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TICKET_ID,
    created_at: NOW,
    updated_at: NOW,
    status: "new",
    category: "question",
    source: "public_kontakt",
    subject: XSS_SUBJECT,
    body: XSS_BODY,
    submitter_user_id: null,
    submitter_email: "xss@test.example",
    submitter_name: "XSS Tester",
    assigned_to: null,
    archived_at: null,
    deleted_at: null,
    ...overrides,
  };
}

test.describe("E48 security — stored XSS rendering (admin side)", () => {
  let dialogFired = false;

  test.beforeEach(async ({ context, page }) => {
    dialogFired = false;
    page.on("dialog", async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await setupAppShell(context, page, {
      session: ADMIN_SESSION,
      extras: {
        tables: {
          support_tickets: [xssTicket()],
          support_ticket_messages: [],
          support_ticket_attachments: [],
        },
        rpcs: { has_role: true },
      },
    });
  });

  test("TC-36: XSS subject in the admin queue is rendered as escaped text", async ({
    adminTicketsQueue,
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await adminTicketsQueue.open();
    await expect(adminTicketsQueue.table).toBeVisible();
    await expect(adminTicketsQueue.row(TICKET_ID)).toContainText(XSS_SUBJECT);

    expect(dialogFired).toBe(false);
    const uncaught = consoleErrors.filter((m) => /Uncaught/i.test(m));
    expect(uncaught).toEqual([]);
  });

  test("TC-37: XSS subject on the admin detail page is rendered as escaped text", async ({
    adminTicketDetail,
  }) => {
    await adminTicketDetail.open(TICKET_ID);
    await expect(adminTicketDetail.subject).toHaveText(XSS_SUBJECT);
    await expect(adminTicketDetail.thread).toBeVisible();
    expect(dialogFired).toBe(false);
  });

  test("TC-39: body containing onerror=, javascript:, data: payloads is rendered as plain text", async ({
    adminTicketDetail,
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await adminTicketDetail.open(TICKET_ID);
    // The body is rendered inside the thread. React escapes children,
    // so the verbatim payload appears in the text content but no
    // markup is interpreted.
    await expect(adminTicketDetail.thread).toContainText("onerror=alert(2)");
    await expect(adminTicketDetail.thread).toContainText("javascript:alert(3)");

    // The thread MUST NOT contain a live <iframe> with the data: src —
    // if React rendered the payload as HTML the iframe would be present.
    const iframeCount = await adminTicketDetail.thread.locator("iframe").count();
    expect(iframeCount).toBe(0);

    expect(dialogFired).toBe(false);
    const uncaught = consoleErrors.filter((m) => /Uncaught/i.test(m));
    expect(uncaught).toEqual([]);
  });
});
