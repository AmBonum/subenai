import { test, expect } from "../../../fixtures/base";
import { primeConsent } from "../../../fixtures/consent";
import { mockSupabase } from "../../../mocks/supabase";

// E48 security — stored XSS payload rendering on the anonymous view.
// Traces TC-38 from specs/support/E48-security.md.
//
// The /kontakt/ticket/$id route reads via the
// get_ticket_thread_for_view_token RPC and renders the subject + thread
// for an unauthenticated visitor following the email link. The same
// React-escapes-children guarantee that protects the admin side has to
// hold here — but the public surface is the one that worries attackers,
// because the URL + token can be shared widely.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const VIEW_TOKEN = "a".repeat(64);
const XSS_SUBJECT = "<script>alert(1)</script>";

test.describe("E48 security — stored XSS rendering (public /kontakt/ticket view)", () => {
  let dialogFired = false;

  test.beforeEach(async ({ context, page }) => {
    dialogFired = false;
    page.on("dialog", async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await primeConsent(context, "all");
    await mockSupabase(page, {
      rpcs: {
        get_ticket_thread_for_view_token: ({ p_view_token }: { p_view_token: string }) => {
          if (p_view_token !== VIEW_TOKEN) return null;
          return {
            ticket: {
              id: TICKET_ID,
              subject: XSS_SUBJECT,
              body: "Body with at least twenty characters here.",
              category: "question",
              status: "new",
              created_at: "2026-05-21T10:00:00.000Z",
              submitter_email: "xss@test.example",
              submitter_name: "XSS Tester",
            },
            messages: [],
            attachments: [],
          };
        },
      },
    });
  });

  test("TC-38: XSS subject on /kontakt/ticket/$id is rendered as escaped text", async ({
    kontaktTicketView,
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await kontaktTicketView.openWithToken(TICKET_ID, VIEW_TOKEN);

    // The literal payload appears in the rendered text content — React
    // escaped it during render.
    await expect(kontaktTicketView.subject).toHaveText(XSS_SUBJECT);

    // No injected <script> made it onto the page as actual markup.
    const scriptCount = await kontaktTicketView.root.locator("script:has-text('alert(1)')").count();
    expect(scriptCount).toBe(0);

    expect(dialogFired).toBe(false);
    const uncaught = consoleErrors.filter((m) => /Uncaught/i.test(m));
    expect(uncaught).toEqual([]);
  });
});
