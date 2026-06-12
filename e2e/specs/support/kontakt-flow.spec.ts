import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { mockSupportApi, type MockSupportApiCaptures } from "../../mocks/api/support";
import { mockSupabase } from "../../mocks/supabase";

// E48 smoke test — public anon flow.
//
// Walks the steps a real anonymous submitter does from /kontakt all the
// way through to opening the view-token thread page. The two layers we
// stub at the network level:
//   - /api/support-ticket-create (CF function) — captures the POST body
//     so the test can assert what the form sent (subject, category,
//     body, email, honeypot empty)
//   - supabase.rpc('get_ticket_thread_for_view_token') — returns the
//     ticket + initial body so the view page renders the thread
//
// We deliberately do NOT exercise real Resend / Turnstile / production
// Supabase — the goal is to lock the wire contract between the React
// form, the CF function, and the view-token RPC. Live email + inbound
// routing checks live in subenai.sk monitoring (separate concern).

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const VIEW_TOKEN = "a".repeat(64);

test.describe("E48 smoke — public anon flow", () => {
  let captures: MockSupportApiCaptures;

  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    captures = await mockSupportApi(context, {
      ticketCreateResponse: { ticket_id: TICKET_ID, view_token: VIEW_TOKEN },
    });
    // The /kontakt/ticket/$id view route uses the supabase-js client.
    // Stub the RPC so the page can render without a real Supabase.
    await mockSupabase(page, {
      rpcs: {
        get_ticket_thread_for_view_token: ({ p_view_token }: { p_view_token: string }) => {
          // Mirror server behaviour: token mismatch -> null.
          if (p_view_token !== VIEW_TOKEN) return null;
          return {
            ticket: {
              id: TICKET_ID,
              subject: "Smoke test E48",
              body: "Toto je smoke test ticket s aspoň dvadsiatimi znakmi.",
              category: "question",
              status: "new",
              created_at: "2026-05-21T10:00:00.000Z",
              submitter_email: "smoke@test.example",
              submitter_name: "Smoke Tester",
            },
            messages: [],
            attachments: [],
          };
        },
      },
    });
  });

  test("submits a ticket and renders success state with ticket id", async ({ kontakt }) => {
    await kontakt.open();
    await expect(kontakt.heading).toBeVisible();

    await kontakt.fillAndSubmit({
      subject: "Smoke test E48",
      category: "question",
      body: "Toto je smoke test ticket s aspoň dvadsiatimi znakmi.",
      email: "smoke@test.example",
      name: "Smoke Tester",
    });

    await expect(kontakt.successState).toBeVisible();
    await expect(kontakt.successTicketId).toHaveText(TICKET_ID);

    // The success state surfaces the tokenized thread link directly so
    // the submitter does not depend on the email arriving.
    await expect(kontakt.successThreadLink).toBeVisible();
    await expect(kontakt.successThreadLink).toHaveAttribute(
      "href",
      `/contact-form/ticket/${TICKET_ID}?token=${VIEW_TOKEN}`,
    );

    // Wire-contract assertion: the form POSTed exactly what the CF
    // function expects (no leaked extra fields, honeypot stayed empty).
    expect(captures.ticketCreateRequests).toHaveLength(1);
    const sent = captures.ticketCreateRequests[0].body as Record<string, unknown>;
    expect(sent.subject).toBe("Smoke test E48");
    expect(sent.category).toBe("question");
    expect(sent.email).toBe("smoke@test.example");
    expect(sent.name).toBe("Smoke Tester");
    expect(sent._h_addr).toBe("");
  });

  test("opens the view-token thread page via the email link", async ({ kontaktTicketView }) => {
    await kontaktTicketView.openWithToken(TICKET_ID, VIEW_TOKEN);

    await expect(kontaktTicketView.subject).toHaveText("Smoke test E48");
    await expect(kontaktTicketView.status).toContainText("Nové");
    await expect(kontaktTicketView.thread).toContainText(
      "Toto je smoke test ticket s aspoň dvadsiatimi znakmi.",
    );
    // No attachments seeded -> section is not rendered.
    await expect(kontaktTicketView.attachments).toBeHidden();
  });

  test("shows the not-found state when token is missing", async ({ kontaktTicketView }) => {
    await kontaktTicketView.openWithoutToken(TICKET_ID);

    await expect(kontaktTicketView.notFoundCard).toBeVisible();
    await expect(kontaktTicketView.notFoundCard).toContainText("Chýba bezpečnostný token");
  });

  test("shows the not-found state when token is invalid (RPC returns null)", async ({
    kontaktTicketView,
  }) => {
    await kontaktTicketView.openWithToken(TICKET_ID, "b".repeat(64));

    await expect(kontaktTicketView.notFoundCard).toBeVisible();
    await expect(kontaktTicketView.notFoundCard).toContainText("Odkaz už nie je platný");
  });

  test("surfaces a friendly error message when the CF function rejects", async ({
    context,
    page,
    kontakt,
  }) => {
    // Override the create mock to force a 429 from the rate limiter.
    await mockSupportApi(context, {
      ticketCreateError: { status: 429, error: "rate_limited_ip" },
    });

    // Trigger fresh navigation so the new route handlers register first.
    await page.goto("/contact-form");

    await kontakt.fillAndSubmit({
      subject: "Smoke rate limit",
      category: "question",
      body: "Body s aspoň dvadsiatimi znakmi pre validáciu.",
      email: "ratelimit@test.example",
    });

    await expect(kontakt.submitError).toBeVisible();
    await expect(kontakt.submitError).toContainText(/priveľa žiadostí/i);
  });
});
