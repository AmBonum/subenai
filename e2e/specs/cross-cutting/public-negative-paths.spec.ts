import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { RESPONDENT_SESSION } from "../../fixtures/auth";
import { stubDonationStatus, makeReadySubscriptionPayload } from "../../mocks/api/donation-status";
import { stubCustomerPortal } from "../../mocks/api/customer-portal";
import { stubDpaRequest, makeDpaRequestSuccess } from "../../mocks/api/dpa-request";
import { mockSupportApi } from "../../mocks/api/support";
import { mockSupabase } from "../../mocks/supabase";
import { setupAppShell } from "../../setup/app-shell";
import { DsrFormPage } from "../../poms/user/DsrFormPage";

// Public-surface negative paths — failure states and 404s for donation
// thank-you, contact form, schools DPA, DSR form, and blog/CMS slugs.
// All stubs are via page.route; no real backend calls are made.

const SESSION_ID = "cs_test_pub_neg_x";

// ---------------------------------------------------------------------------
// A. Donation thank-you page (/thank-you/<sessionId>)
// ---------------------------------------------------------------------------

test.describe("A. Donation thank-you page — negative states", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // PUB-01: not_found session renders the NotFoundState
  test("PUB-01: 404 session renders the not-found state", async ({ page, podakovanie }) => {
    await test.step("Stub donation-status to return 404 and navigate to /thank-you/cs_test_pub_neg_x", async () => {
      await stubDonationStatus(page, { status: 404 });
      await podakovanie.open(SESSION_ID);
    });

    await test.step("Verify the not-found state is visible", async () => {
      await expect(podakovanie.stateNotFound).toBeVisible();
    });

    await test.step("Verify the not-found heading reads 'Neznáma platba'", async () => {
      await expect(podakovanie.notFoundHeading).toHaveText("Neznáma platba");
    });
  });

  // PUB-02: unpaid session renders the UnpaidState
  test("PUB-02: unpaid session renders the unpaid state", async ({ page, podakovanie }) => {
    await test.step("Stub donation-status to return unpaid payload and navigate", async () => {
      await stubDonationStatus(page, {
        status: 200,
        body: { status: "unpaid", is_subscription: false, has_customer: false },
      });
      await podakovanie.open(SESSION_ID);
    });

    await test.step("Verify the unpaid state is visible", async () => {
      await expect(podakovanie.stateUnpaid).toBeVisible();
    });

    await test.step("Verify the unpaid heading reads 'Platba ešte neprešla'", async () => {
      await expect(podakovanie.unpaidHeading).toHaveText("Platba ešte neprešla");
    });
  });

  // PUB-03: server 500 renders the terminal ErrorState
  test("PUB-03: server 500 renders the terminal error state", async ({ page, podakovanie }) => {
    await test.step("Stub donation-status to return 500 and navigate", async () => {
      await stubDonationStatus(page, { status: 500 });
      await podakovanie.open(SESSION_ID);
    });

    await test.step("Verify the error state is visible", async () => {
      await expect(podakovanie.stateError).toBeVisible();
    });

    await test.step("Verify the error heading reads 'Niečo sa pokazilo'", async () => {
      await expect(podakovanie.errorHeading).toHaveText("Niečo sa pokazilo");
    });
  });

  // PUB-04: pending never resolving reaches the TimeoutState via page.clock
  test("PUB-04: permanently-pending poller reaches the timeout state after POLL_MAX_MS", async ({
    page,
    podakovanie,
  }) => {
    await test.step("Install a fake clock and stub donation-status to always return pending", async () => {
      await page.clock.install();
      await stubDonationStatus(page, {
        status: 200,
        body: { status: "pending" },
      });
    });

    await test.step("Navigate to /thank-you/cs_test_pub_neg_x", async () => {
      await podakovanie.open(SESSION_ID);
    });

    await test.step("Verify the pending state is shown initially", async () => {
      await expect(podakovanie.statePending).toBeVisible();
    });

    await test.step("Fast-forward past POLL_MAX_MS (30 000 ms) so the poller gives up", async () => {
      // POLL_MAX_MS = 30 000 ms; advance by 31 000 ms to clear all pending timers
      await page.clock.fastForward(31_000);
    });

    await test.step("Verify the timeout state is now visible", async () => {
      await expect(podakovanie.stateTimeout).toBeVisible();
    });

    await test.step("Verify the timeout heading reads 'Stále spracúvame…'", async () => {
      await expect(podakovanie.timeoutHeading).toHaveText("Stále spracúvame…");
    });
  });

  // PUB-05: subscription portal button failure shows the alert with error code and contact email
  test("PUB-05: subscription portal 403 shows alert with error code and contact e-mail", async ({
    page,
    podakovanie,
  }) => {
    await test.step("Stub donation-status to return a ready subscription payload", async () => {
      await stubDonationStatus(page, {
        status: 200,
        body: makeReadySubscriptionPayload(),
      });
    });

    await test.step("Stub customer-portal to return 403 session_expired", async () => {
      await stubCustomerPortal(page, { status: 403, error: "session_expired" });
    });

    await test.step("Navigate to /thank-you/cs_test_pub_neg_x", async () => {
      await podakovanie.open(SESSION_ID);
    });

    await test.step("Verify the ready state and subscription block are visible", async () => {
      await expect(podakovanie.stateReady).toBeVisible();
      await expect(podakovanie.subscriptionBlock).toBeVisible();
    });

    await test.step("Click the 'Spravovať odber' button", async () => {
      await podakovanie.manageSubscriptionButton.click();
    });

    await test.step("Verify the portal error alert is visible and contains 'session_expired'", async () => {
      await expect(podakovanie.portalError).toBeVisible();
      await expect(podakovanie.portalError).toContainText("session_expired");
    });

    await test.step("Verify the portal error contains a contact e-mail mailto link", async () => {
      await expect(podakovanie.portalErrorMailtoLink).toBeVisible();
    });

    await test.step("Re-stub customer-portal to 200 and verify manage button is re-enabled", async () => {
      await stubCustomerPortal(page, { status: 200, url: "https://billing.stripe.com/p/x" });
      await expect(podakovanie.manageSubscriptionButton).toBeEnabled();
    });
  });
});

// ---------------------------------------------------------------------------
// B. Public contact form (/contact-form)
// ---------------------------------------------------------------------------

test.describe("B. Public contact form — error states", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // PUB-06: 500 shows error, inputs retain values, retry succeeds
  // Note: the happy-path retry is NOT simulated here. The contact route
  // invalidates the single-use Turnstile token after a failed submit
  // (setTurnstileToken(null), contact-form.index.tsx:164). In the test
  // env VITE_TURNSTILE_SITE_KEY is empty, so TurnstileWidget takes the
  // `onToken("disabled")` shortcut which fires once on mount and never
  // re-arms — so a second submit throws before reaching the API. In prod
  // the real widget re-issues a token via its callback. The negative path
  // (500 → error shown, inputs preserved) is the bug-surface that matters.
  test("PUB-06: submit 500 shows the form error and preserves the entered values", async ({
    context,
    kontakt,
  }) => {
    await test.step("Register a 500 stub for support-ticket-create and open /contact-form", async () => {
      await mockSupportApi(context, {
        ticketCreateError: { status: 500, error: "internal_server_error" },
      });
      await kontakt.open();
    });

    await test.step("Fill all required fields with valid data", async () => {
      await kontakt.subjectInput.fill("Test chyba 500");
      await kontakt.categorySelect.click();
      await kontakt.categoryOption("question").click();
      await kontakt.bodyTextarea.fill("Toto je test chyby. Toto je test chyby. Toto je test.");
      await kontakt.emailInput.fill("test@example.com");
    });

    await test.step("Submit the form", async () => {
      await kontakt.submitButton.click();
    });

    await test.step("Verify the submit error alert is visible with generic error copy", async () => {
      await expect(kontakt.submitError).toBeVisible();
      await expect(kontakt.submitError).toContainText("Nepodarilo sa odoslať");
    });

    await test.step("Verify the subject input still holds 'Test chyba 500'", async () => {
      await expect(kontakt.subjectInput).toHaveValue("Test chyba 500");
    });

    await test.step("Verify the email input still holds 'test@example.com'", async () => {
      await expect(kontakt.emailInput).toHaveValue("test@example.com");
    });
  });

  // PUB-07: 429 rate_limited shows the rate-limit copy
  test("PUB-07: 429 rate_limited shows the rate-limit error copy", async ({ context, kontakt }) => {
    await test.step("Stub support-ticket-create to return 429 rate_limited_ip and open /contact-form", async () => {
      await mockSupportApi(context, {
        ticketCreateError: { status: 429, error: "rate_limited_ip" },
      });
      await kontakt.open();
    });

    await test.step("Fill required fields and submit", async () => {
      await kontakt.subjectInput.fill("Rate limit test");
      await kontakt.categorySelect.click();
      await kontakt.categoryOption("bug").click();
      await kontakt.bodyTextarea.fill("Toto je test rate limitu. Toto je test rate limitu test.");
      await kontakt.emailInput.fill("rate@example.com");
      await kontakt.submitButton.click();
    });

    await test.step("Verify the submit error contains the rate-limited copy", async () => {
      await expect(kontakt.submitError).toBeVisible();
      await expect(kontakt.submitError).toContainText(
        "Z tejto IP adresy si poslal/a priveľa žiadostí",
      );
    });
  });

  // PUB-08: network abort shows the offline/connection copy
  test("PUB-08: network abort shows connection error copy", async ({ page, kontakt }) => {
    await test.step("Register a route abort for support-ticket-create and open /contact-form", async () => {
      await page.route("**/api/support-ticket-create", (route) => route.abort("connectionrefused"));
      await kontakt.open();
    });

    await test.step("Fill required fields and submit", async () => {
      await kontakt.subjectInput.fill("Sieť padla");
      await kontakt.categorySelect.click();
      await kontakt.categoryOption("other").click();
      await kontakt.bodyTextarea.fill("Toto je test siete. Toto je test siete. Test siete.");
      await kontakt.emailInput.fill("net@example.com");
      await kontakt.submitButton.click();
    });

    await test.step("Verify the submit error is visible after connection abort", async () => {
      await expect(kontakt.submitError).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// C. Schools DPA form (/schools/dpa)
// ---------------------------------------------------------------------------

test.describe("C. Schools DPA form — error states", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // PUB-09: dpa-request 500 shows failure state, retry succeeds
  test("PUB-09: dpa-request 500 shows the error state, retry → success", async ({
    page,
    schoolsDpa,
  }) => {
    await test.step("Stub dpa-request to return 500 and open /schools/dpa", async () => {
      await stubDpaRequest(page, { status: 500 });
      await schoolsDpa.open();
    });

    await test.step("Skip if VITE_DPA_FLOW_ENABLED is OFF (feature flag controls form visibility)", async () => {
      const formVisible = await schoolsDpa.form.isVisible().catch(() => false);
      test.skip(!formVisible, "VITE_DPA_FLOW_ENABLED is OFF — form branch not rendered");
    });

    await test.step("Fill all required fields", async () => {
      await schoolsDpa.fillForm({
        name: "Jana Nováková",
        email: "jana@skola.sk",
        school: "ZŠ Testovacia",
      });
    });

    await test.step("Submit the form", async () => {
      await schoolsDpa.formSubmit.click();
    });

    await test.step("Verify the error status alert is visible", async () => {
      await expect(schoolsDpa.formStatus).toBeVisible();
    });

    await test.step("Re-stub dpa-request to return a 200 success body", async () => {
      await page.unroute("**/api/dpa-request");
      await stubDpaRequest(page, {
        status: 200,
        body: makeDpaRequestSuccess(),
      });
    });

    await test.step("Submit again and verify the success state appears", async () => {
      await schoolsDpa.formSubmit.click();
      await expect(schoolsDpa.formSuccess).toBeVisible({ timeout: 15_000 });
    });
  });

  // PUB-10: network abort shows the error state (catch block ~215)
  test("PUB-10: network abort before row accepted shows the error alert", async ({
    page,
    schoolsDpa,
  }) => {
    await test.step("Abort the dpa-request route and open /schools/dpa", async () => {
      await page.route("**/api/dpa-request", (route) => route.abort("connectionrefused"));
      await schoolsDpa.open();
    });

    await test.step("Skip if VITE_DPA_FLOW_ENABLED is OFF", async () => {
      const formVisible = await schoolsDpa.form.isVisible().catch(() => false);
      test.skip(!formVisible, "VITE_DPA_FLOW_ENABLED is OFF — form branch not rendered");
    });

    await test.step("Fill all required fields", async () => {
      await schoolsDpa.fillForm({
        name: "Peter Testový",
        email: "peter@skola.sk",
        school: "ZŠ Abortovacia",
      });
    });

    await test.step("Submit the form", async () => {
      await schoolsDpa.formSubmit.click();
    });

    await test.step("Verify the error status alert is visible after abort", async () => {
      await expect(schoolsDpa.formStatus).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// D. DSR form (/app/legal/dsr)
// ---------------------------------------------------------------------------

test.describe("D. DSR form — error state", () => {
  // PUB-11: DSR submit failure shows error, preserves e-mail, retry → success
  test("PUB-11: DSR submit failure shows the error banner; retry → success", async ({
    context,
    page,
  }) => {
    const userEmail = RESPONDENT_SESSION.user.email;
    const dsrPage = new DsrFormPage(page);

    await test.step("Set up app shell with dsr_requests error stub and navigate to /app/legal/dsr", async () => {
      await setupAppShell(context, page, {
        session: RESPONDENT_SESSION,
        extras: {
          tables: { dsr_requests: [] },
          errors: { dsr_requests: { status: 500, message: "db_error" } },
        },
      });
      await dsrPage.open();
    });

    await test.step("Verify the DSR form card is visible and the e-mail input shows the user's email", async () => {
      await expect(dsrPage.formCard).toBeVisible();
      await expect(dsrPage.emailInput).toHaveValue(userEmail);
    });

    await test.step("Click the submit button", async () => {
      await dsrPage.submitButton.click();
    });

    await test.step("Verify the error banner is visible with the generic error copy", async () => {
      await expect(dsrPage.errorBanner).toBeVisible();
      await expect(dsrPage.errorBanner).toContainText(
        "Žiadosť sa nepodarilo odoslať. Skús to znova.",
      );
    });

    await test.step("Verify the e-mail input still shows the user's email after the failure", async () => {
      await expect(dsrPage.emailInput).toHaveValue(userEmail);
    });

    await test.step("Re-mock Supabase without the dsr_requests error and retry", async () => {
      await mockSupabase(page, {
        auth: { session: RESPONDENT_SESSION },
        tables: { dsr_requests: [] },
        generateIds: ["dsr_requests"],
      });
      await dsrPage.submitButton.click();
    });

    await test.step("Verify the success banner is visible", async () => {
      await expect(dsrPage.successBanner).toBeVisible();
      await expect(dsrPage.successBanner).toContainText("Žiadosť bola podaná");
    });
  });
});

// ---------------------------------------------------------------------------
// E. Blog + share-page 404s
// ---------------------------------------------------------------------------

test.describe("E. Blog and CMS page 404s", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // PUB-12: unknown /s/<slug> renders the app 404 page
  test("PUB-12: unknown /s/<slug> renders the global 404 page, not a blank page", async ({
    page,
    notFound,
  }) => {
    await test.step("Mock Supabase cms_pages as empty and navigate to /s/neexistujuci-slug", async () => {
      await mockSupabase(page, {
        tables: {
          cms_pages: [],
        },
      });
      await page.goto("/s/neexistujuci-slug", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify the global 404 heading is visible", async () => {
      await expect(notFound.heading).toBeVisible();
    });

    await test.step("Verify the back-to-home CTA renders (not a blank dead-end)", async () => {
      // The 404 is a standalone surface (no global header by design); the
      // home CTA is the way out that proves the page isn't blank.
      await expect(notFound.homeCta).toBeVisible();
    });
  });

  // PUB-13: unknown /academy/<slug> renders the global 404 (E55 — the loader
  // throws notFound() for a missing entry, surfacing the app 404 surface).
  test("PUB-13: unknown /academy/<slug> renders the global 404 page", async ({
    page,
    notFound,
  }) => {
    await test.step("Mock Supabase blog_posts as empty and navigate to /academy/neexistujuci-clanok", async () => {
      await mockSupabase(page, {
        tables: {
          blog_posts: [],
          blog_categories: [],
          blog_authors: [],
        },
      });
      await page.goto("/academy/neexistujuci-clanok", { waitUntil: "domcontentloaded" });
    });

    await test.step("Verify the global 404 heading is visible", async () => {
      await expect(notFound.heading).toBeVisible();
    });

    await test.step("Verify the back-to-home CTA renders (not a blank dead-end)", async () => {
      await expect(notFound.homeCta).toBeVisible();
    });
  });
});
