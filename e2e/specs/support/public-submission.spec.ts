import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { mockSupportApi, type MockSupportApiCaptures } from "../../mocks/api/support";
import { mockSupabase } from "../../mocks/supabase";

// Wave 4 — Public submission slice.
//
// Covers TC-01 (happy path), TC-05 (subject too short), TC-07 (bad email),
// TC-08 (server 429), TC-15 (subject 200-char boundary accepted in UI),
// TC-23 (double-click → single POST), TC-37 (back/forward no resubmit).
//
// The mock layer stubs both the CF function and the Supabase RPC so no
// real DB or Resend call is made.

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const VIEW_TOKEN = "a".repeat(64);

function stubViewTokenRpc(page: Parameters<typeof mockSupabase>[0]) {
  return mockSupabase(page, {
    rpcs: {
      get_ticket_thread_for_view_token: ({ p_view_token }: { p_view_token: string }) => {
        if (p_view_token !== VIEW_TOKEN) return null;
        return {
          ticket: {
            id: TICKET_ID,
            subject: "Testovacia žiadosť",
            body: "Toto je testovací text so správnym počtom znakov.",
            category: "question",
            status: "new",
            created_at: "2026-05-22T10:00:00.000Z",
            submitter_email: "anon@test.example",
            submitter_name: "Anon User",
          },
          messages: [],
          attachments: [],
        };
      },
    },
  });
}

test.describe("Public submission — /contact-form", () => {
  let captures: MockSupportApiCaptures;

  test.beforeEach(async ({ context, page }) => {
    await primeConsent(context, "all");
    captures = await mockSupportApi(context, {
      ticketCreateResponse: { ticket_id: TICKET_ID, view_token: VIEW_TOKEN },
    });
    await stubViewTokenRpc(page);
  });

  // TC-01: Anonymous submitter completes the contact form and sees ticket id in success state
  test("TC-01: Anonymous submitter completes the form and sees ticket id in success state", async ({
    kontakt,
  }) => {
    await test.step("Open /contact-form", async () => {
      await kontakt.open();
      await expect(kontakt.heading).toBeVisible();
    });

    await test.step("Fill in all required fields and submit", async () => {
      await kontakt.fillAndSubmit({
        subject: "Testovacia žiadosť",
        category: "question",
        body: "Toto je testovací text so správnym počtom znakov.",
        email: "anon@test.example",
        name: "Anon User",
      });
    });

    await test.step("Verify success state is visible with the returned ticket id", async () => {
      await expect(kontakt.successState).toBeVisible();
      await expect(kontakt.successTicketId).toHaveText(TICKET_ID);
    });

    await test.step("Verify exactly one POST was fired with honeypot empty", async () => {
      expect(captures.ticketCreateRequests).toHaveLength(1);
      const sent = captures.ticketCreateRequests[0].body as Record<string, unknown>;
      expect(sent.subject).toBe("Testovacia žiadosť");
      expect(sent.category).toBe("question");
      expect(sent.email).toBe("anon@test.example");
      expect(sent.name).toBe("Anon User");
      expect(sent._h_addr).toBe("");
    });

    await test.step("Verify no Authorization cookie was sent (anonymous context)", async () => {
      const headers = captures.ticketCreateRequests[0].headers as Record<string, string>;
      const cookie = headers["cookie"] ?? "";
      expect(cookie).not.toMatch(/sb-.*-auth-token/);
    });
  });

  // TC-05: Subject empty (below min(1)) fails client-side validation
  // NOTE: The plan says "5-char minimum" but the actual zod schema in
  // support-form-config.ts uses min(1). A 2-char subject ("Hi") is valid
  // per the schema. This test exercises the actual minimum (empty string)
  // to cover the client-side validation path. See plan discrepancy note in PR.
  test("TC-05: Empty subject shows field-level error; no POST fired", async ({ kontakt }) => {
    await test.step("Open /contact-form", async () => {
      await kontakt.open();
    });

    await test.step("Leave subject empty, fill other fields, and click submit", async () => {
      // Subject stays empty — do not fill it.
      await kontakt.categorySelect.click();
      await kontakt.categoryOption("question").click();
      await kontakt.bodyTextarea.fill("Toto je telo správy s dostatok znakmi pre test.");
      await kontakt.emailInput.fill("anon@test.example");
      await kontakt.submitButton.click();
    });

    await test.step("Verify subject error is visible", async () => {
      await expect(kontakt.subjectError).toBeVisible();
    });

    await test.step("Verify no server-level error and no POST was sent", async () => {
      await expect(kontakt.submitError).toBeHidden();
      expect(captures.ticketCreateRequests).toHaveLength(0);
    });
  });

  // TC-07: Malformed email is rejected client-side before submit
  test("TC-07: Malformed email shows field-level error; no POST fired", async ({ kontakt }) => {
    await test.step("Open /contact-form", async () => {
      await kontakt.open();
    });

    await test.step("Fill valid subject and body, then enter a non-email address", async () => {
      await kontakt.subjectInput.fill("Platná téma žiadosti");
      await kontakt.categorySelect.click();
      await kontakt.categoryOption("question").click();
      await kontakt.bodyTextarea.fill("Toto je telo správy s dostatok znakmi pre test.");
      await kontakt.emailInput.fill("not-an-email");
      await kontakt.submitButton.click();
    });

    await test.step("Verify email error is visible and no POST was fired", async () => {
      await expect(kontakt.emailError).toBeVisible();
      expect(captures.ticketCreateRequests).toHaveLength(0);
    });
  });

  // TC-08: Server 429 rate_limited_ip maps to user-visible Slovak error message
  test("TC-08: Server 429 maps to Slovak 'príliš veľa žiadostí' error", async ({
    context,
    page,
    kontakt,
  }) => {
    await test.step("Re-wire mock to return 429 rate_limited_ip", async () => {
      await mockSupportApi(context, {
        ticketCreateError: { status: 429, error: "rate_limited_ip" },
      });
      await page.goto("/contact-form");
    });

    await test.step("Fill all required fields and submit", async () => {
      await kontakt.fillAndSubmit({
        subject: "Testovacia žiadosť pre rate limit",
        category: "question",
        body: "Toto je telo správy s dostatok znakmi pre test.",
        email: "ratelimit@test.example",
      });
    });

    await test.step("Verify user-facing Slovak error contains expected text", async () => {
      await expect(kontakt.submitError).toBeVisible();
      await expect(kontakt.submitError).toContainText(
        "Z tejto IP adresy si poslal/a priveľa žiadostí. Skús to neskôr.",
      );
    });
  });

  // TC-15: Subject at exactly 200-char boundary is accepted (UI layer)
  test("TC-15: Subject at exactly 200-char boundary is accepted and form submits successfully", async ({
    kontakt,
  }) => {
    const subject200 = "a".repeat(200);

    await test.step("Open /contact-form", async () => {
      await kontakt.open();
    });

    await test.step("Fill a 200-char subject and all other required fields", async () => {
      await kontakt.fillAndSubmit({
        subject: subject200,
        category: "question",
        body: "Toto je telo správy s dostatok znakmi pre validáciu.",
        email: "boundary@test.example",
      });
    });

    await test.step("Verify success state is visible — boundary is accepted", async () => {
      await expect(kontakt.successState).toBeVisible();
      expect(captures.ticketCreateRequests).toHaveLength(1);
    });
  });

  // TC-23: Double-click on "Odoslať žiadosť" sends exactly one POST
  test("TC-23: Double-click on submit button sends exactly one POST", async ({ kontakt }) => {
    await test.step("Open /contact-form and fill all required fields", async () => {
      await kontakt.open();
      await kontakt.subjectInput.fill("Testovacia žiadosť pre double-click");
      await kontakt.categorySelect.click();
      await kontakt.categoryOption("question").click();
      await kontakt.bodyTextarea.fill("Toto je telo správy s dostatok znakmi pre validáciu.");
      await kontakt.emailInput.fill("doubleclick@test.example");
    });

    await test.step("Double-click the submit button within 300ms", async () => {
      await kontakt.submitButton.dblclick();
    });

    await test.step("Wait for success state and verify exactly one request was captured", async () => {
      await expect(kontakt.successState).toBeVisible();
      expect(captures.ticketCreateRequests).toHaveLength(1);
    });
  });

  // TC-37: Back/forward navigation after submit does not resubmit
  test("TC-37: Back navigation after submit shows the form again — no re-POST on forward", async ({
    page,
    kontakt,
  }) => {
    await test.step("Open /contact-form, fill all fields, and submit", async () => {
      await kontakt.open();
      await kontakt.fillAndSubmit({
        subject: "Testovacia žiadosť",
        category: "question",
        body: "Toto je testovací text so správnym počtom znakov.",
        email: "backforward@test.example",
      });
    });

    await test.step("Verify success state is visible", async () => {
      await expect(kontakt.successState).toBeVisible();
    });

    await test.step("Press browser Back — navigates away from /contact-form", async () => {
      await page.goBack();
    });

    await test.step("Press browser Forward — /contact-form reloads with empty form, not success state", async () => {
      await page.goForward();
      await expect(kontakt.form).toBeVisible();
      await expect(kontakt.successState).toBeHidden();
    });

    await test.step("Verify no additional POST was fired by back/forward", async () => {
      expect(captures.ticketCreateRequests).toHaveLength(1);
    });
  });
});
