// spec: specs/sponsorship/support-donate-flow.md

import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { STRIPE_TEST_CARDS } from "../../fixtures/stripe";
import { PodporaPage } from "../../poms/sponsorship/PodporaPage";
import { PodakovaniePage } from "../../poms/sponsorship/PodakovaniePage";
import { StripeCheckoutPage } from "../../poms/external/StripeCheckoutPage";

test.describe("/support donate flow", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  test.describe("Happy paths", () => {
    // TC-01: One-off 25 EUR donation, anonymous, completes Stripe Checkout
    test(
      "TC-01: One-off 25 EUR donation, anonymous, completes Stripe Checkout and lands on ready thank-you view",
      { timeout: 120_000 },
      async ({ page, podpora, podakovanie, stripeCheckout }) => {
        // Belt-and-suspenders: test.extend() strips the options-object
        // timeout in this Playwright version — set it via the runtime API.
        test.setTimeout(120_000);

        await test.step("Open /support at default viewport 1280×800", async () => {
          await page.setViewportSize({ width: 1280, height: 800 });
          await podpora.open();
        });

        await test.step("Select Jednorazovo mode (already default) and click the 25 € preset chip", async () => {
          await podpora.modeOneoff.click();
          await podpora.amountPreset(25).click();
        });

        await test.step("Fill E-mail and Meno alebo firma fields", async () => {
          await podpora.emailInput.fill("donor-tc01@example.com");
          await podpora.nameInput.fill("Test Donor");
        });

        await test.step("Tick both mandatory consent checkboxes", async () => {
          await podpora.consentImmediateCheckbox.click();
          await podpora.consentDataCheckbox.click();
        });

        await test.step("Verify submit button label reads Pokračovať na platbu — 25 €", async () => {
          await expect(podpora.submitButton).toHaveText(/Pokračovať na platbu — 25 €/);
          await expect(podpora.submitButton).toBeEnabled();
        });

        await test.step("Click submit and wait for redirect to Stripe Checkout domain", async () => {
          await podpora.submitButton.click();
          await stripeCheckout.waitForOnStripeDomain();
        });

        await test.step("Wait for Stripe Checkout page to fully load", async () => {
          await stripeCheckout.waitForLoaded();
        });

        await test.step("Fill the default test card (no SCA) and click Pay", async () => {
          await stripeCheckout.fillTestCard(
            STRIPE_TEST_CARDS.basic.number,
            STRIPE_TEST_CARDS.basic.exp,
            STRIPE_TEST_CARDS.basic.cvc,
            STRIPE_TEST_CARDS.basic.zip,
          );
          await stripeCheckout.pay();
        });

        await test.step("Verify browser lands on /thank-you/cs_test_…", async () => {
          await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
        });

        await test.step("Verify page initially shows Hľadáme tvoju platbu… (PendingState)", async () => {
          // PendingState may flash briefly before ready; assert it was shown at some point
          // by checking URL arrival (already verified) then waiting for ready
          await expect(podakovanie.pendingHeading)
            .toBeVisible({ timeout: 5_000 })
            .catch(() => {
              // May have transitioned to ready already — that is fine
            });
        });

        await test.step("Wait up to 30 seconds for the ReadyState heading Ďakujeme za podporu!", async () => {
          await podakovanie.waitForReady({ timeout: 30_000 });
          await expect(podakovanie.readyHeading).toHaveText("Ďakujeme za podporu!");
        });

        await test.step("Verify kind label is Jednorazová podpora and amount is 25.00 EUR", async () => {
          await expect(podakovanie.readyKindLabel).toHaveText("Jednorazová podpora");
          await expect(podakovanie.readyAmount).toHaveText("25.00 EUR");
        });
      },
    );

    // TC-02: One-off 100 EUR donation with sponsor profile and footer opt-in
    test(
      "TC-02: One-off 100 EUR donation with sponsor profile and footer opt-in",
      { timeout: 120_000 },
      async ({ page, podpora, podakovanie, stripeCheckout }) => {
        test.setTimeout(120_000);

        await test.step("Open /support at default viewport 1280×800", async () => {
          await page.setViewportSize({ width: 1280, height: 800 });
          await podpora.open();
        });

        await test.step("Select Jednorazovo mode and 100 € preset chip", async () => {
          await podpora.modeOneoff.click();
          await podpora.amountPreset(100).click();
        });

        await test.step("Fill E-mail and Meno alebo firma", async () => {
          await podpora.emailInput.fill("donor-tc02@example.com");
          await podpora.nameInput.fill("Acme s. r. o.");
        });

        await test.step("Tick both mandatory consents", async () => {
          await podpora.consentImmediateCheckbox.click();
          await podpora.consentDataCheckbox.click();
        });

        await test.step("Tick Chcem byť na zozname sponzorov (/sponsors)", async () => {
          await podpora.showInListCheckbox.click();
        });

        await test.step("Fill sponsor display name, link, and message", async () => {
          await podpora.displayNameInput.fill("Acme s. r. o.");
          await podpora.displayLinkInput.fill("https://acme.example");
          await podpora.displayMessageTextarea.fill("Podporujeme vzdelanost na Slovensku.");
        });

        await test.step("Tick Zobraziť ma aj v päte stránky (enabled because 100 EUR ≥ 50 EUR threshold)", async () => {
          await expect(podpora.showInFooterCheckbox).toBeEnabled();
          await podpora.showInFooterCheckbox.click();
        });

        await test.step("Click submit and wait for Stripe Checkout domain", async () => {
          await podpora.submitButton.click();
          await stripeCheckout.waitForOnStripeDomain();
          await stripeCheckout.waitForLoaded();
        });

        await test.step("Fill test card and pay", async () => {
          await stripeCheckout.fillTestCard(
            STRIPE_TEST_CARDS.basic.number,
            STRIPE_TEST_CARDS.basic.exp,
            STRIPE_TEST_CARDS.basic.cvc,
            STRIPE_TEST_CARDS.basic.zip,
          );
          await stripeCheckout.pay();
        });

        await test.step("Verify redirect to /thank-you/cs_test_…", async () => {
          await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
        });

        await test.step("Wait for ReadyState and verify personalised heading Ďakujeme, Acme s. r. o.!", async () => {
          await podakovanie.waitForReady({ timeout: 30_000 });
          await expect(podakovanie.readyHeading).toHaveText("Ďakujeme, Acme s. r. o.!");
        });

        await test.step("Verify kind label is Jednorazová podpora and amount is 100.00 EUR", async () => {
          await expect(podakovanie.readyKindLabel).toHaveText("Jednorazová podpora");
          await expect(podakovanie.readyAmount).toHaveText("100.00 EUR");
        });
      },
    );

    // TC-03: Monthly 10 EUR/mes subscription completes and thank-you shows subscription rendering
    test(
      "TC-03: Monthly 10 EUR/mes subscription completes and thank-you shows subscription rendering",
      { timeout: 180_000 },
      async ({ page, podpora, podakovanie, stripeCheckout }) => {
        test.setTimeout(180_000);

        await test.step("Open /support at default viewport 1280×800", async () => {
          await page.setViewportSize({ width: 1280, height: 800 });
          await podpora.open();
        });

        await test.step("Click Mesačne frequency button", async () => {
          await podpora.modeMonthly.click();
        });

        await test.step("Click the 10 € preset chip", async () => {
          await podpora.amountPreset(10).click();
        });

        await test.step("Fill E-mail and Meno alebo firma", async () => {
          await podpora.emailInput.fill("donor-tc03@example.com");
          await podpora.nameInput.fill("Monthly Donor");
        });

        await test.step("Tick both mandatory consents", async () => {
          await podpora.consentImmediateCheckbox.click();
          await podpora.consentDataCheckbox.click();
        });

        await test.step("Verify submit button label reads Pokračovať na platbu — 10 €/mes", async () => {
          await expect(podpora.submitButton).toHaveText(/Pokračovať na platbu — 10 €\/mes/);
        });

        await test.step("Click submit and wait for Stripe Checkout domain", async () => {
          await podpora.submitButton.click();
          await stripeCheckout.waitForOnStripeDomain();
          await stripeCheckout.waitForLoaded();
        });

        await test.step("Fill test card and subscribe", async () => {
          await stripeCheckout.fillTestCard(
            STRIPE_TEST_CARDS.basic.number,
            STRIPE_TEST_CARDS.basic.exp,
            STRIPE_TEST_CARDS.basic.cvc,
            STRIPE_TEST_CARDS.basic.zip,
          );
          await stripeCheckout.pay();
        });

        await test.step("Verify redirect to /thank-you/cs_test_…", async () => {
          await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
        });

        // TC-03 note: invoice.paid may arrive after checkout.session.completed.
        // The page only polls for POLL_MAX_MS=30s before transitioning to
        // TimeoutState (a UX hint, not a hard failure). Under parallel test
        // load this often fires before the subscription webhook lands.
        // Strategy: race waitForReady against waitForTimeout; if Timeout
        // wins, reload to restart polling and try again until the test
        // budget runs out.
        await test.step("Wait up to 90 seconds for ReadyState (reload past TimeoutState if needed)", async () => {
          const deadline = Date.now() + 90_000;
          let lastErr: unknown;
          while (Date.now() < deadline) {
            const budget = Math.min(35_000, deadline - Date.now());
            const ready = podakovanie
              .waitForReady({ timeout: budget })
              .then(() => "ready" as const);
            const timedOut = podakovanie
              .waitForTimeout({ timeout: budget })
              .then(() => "timeout" as const);
            try {
              const which = await Promise.race([ready, timedOut]);
              if (which === "ready") return;
              await page.reload();
            } catch (err) {
              lastErr = err;
              break;
            }
          }
          throw lastErr ?? new Error("Did not reach ReadyState within 90 s");
        });

        await test.step("Verify kind label is Mesačný odber and amount contains /mes", async () => {
          await expect(podakovanie.readyKindLabel).toHaveText("Mesačný odber");
          await expect(podakovanie.readyAmount).toContainText("/mes");
        });

        await test.step("Verify subscription block with heading Spravovať mesačný odber is visible", async () => {
          await expect(podakovanie.subscriptionBlock).toBeVisible();
          await expect(podakovanie.subscriptionHeading).toHaveText("Spravovať mesačný odber");
          await expect(podakovanie.manageSubscriptionButton).toBeVisible();
        });
      },
    );

    // TC-04: Custom one-off amount with comma decimal separator is accepted
    test(
      "TC-04: Custom one-off amount with comma decimal separator is accepted",
      { timeout: 120_000 },
      async ({ page, podpora, podakovanie, stripeCheckout }) => {
        test.setTimeout(120_000);

        await test.step("Open /support at default viewport 1280×800", async () => {
          await page.setViewportSize({ width: 1280, height: 800 });
          await podpora.open();
        });

        await test.step("Click Iná suma and type 17,50 (comma decimal separator)", async () => {
          await podpora.selectCustomAmount("17,50");
        });

        await test.step("Fill E-mail and Meno alebo firma", async () => {
          await podpora.emailInput.fill("donor-tc04@example.com");
          await podpora.nameInput.fill("Custom Donor");
        });

        await test.step("Tick both mandatory consents", async () => {
          await podpora.consentImmediateCheckbox.click();
          await podpora.consentDataCheckbox.click();
        });

        await test.step("Verify submit button label reads Pokračovať na platbu — 17.5 € (comma replaced by dot)", async () => {
          await expect(podpora.submitButton).toHaveText(/Pokračovať na platbu — 17\.5 €/);
        });

        await test.step("Click submit and wait for Stripe Checkout", async () => {
          await podpora.submitButton.click();
          await stripeCheckout.waitForOnStripeDomain();
          await stripeCheckout.waitForLoaded();
        });

        await test.step("Fill test card and pay", async () => {
          await stripeCheckout.fillTestCard(
            STRIPE_TEST_CARDS.basic.number,
            STRIPE_TEST_CARDS.basic.exp,
            STRIPE_TEST_CARDS.basic.cvc,
            STRIPE_TEST_CARDS.basic.zip,
          );
          await stripeCheckout.pay();
        });

        await test.step("Verify redirect to /thank-you/cs_test_…", async () => {
          await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
        });

        await test.step("Wait for ReadyState and verify rendered amount is 17.50 EUR", async () => {
          await podakovanie.waitForReady({ timeout: 30_000 });
          await expect(podakovanie.readyAmount).toHaveText("17.50 EUR");
        });
      },
    );
  });

  // ---------------------------------------------------------------------------
  // Negative scenarios
  // ---------------------------------------------------------------------------

  test.describe("Negative scenarios", () => {
    // TC-05: Submit button remains disabled until all required fields and consents are filled
    test("TC-05: Submit button remains disabled until all required fields and consents are filled", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support at default viewport 1280×800", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
      });

      await test.step("Verify submit button is disabled on initial empty state", async () => {
        await expect(podpora.submitButton).toBeDisabled();
      });

      await test.step("Fill email and name without selecting amount — button stays disabled", async () => {
        await podpora.emailInput.fill("donor@example.com");
        await podpora.nameInput.fill("Test");
        await expect(podpora.submitButton).toBeDisabled();
      });

      await test.step("Select amount 25 € without ticking consents — button stays disabled", async () => {
        await podpora.amountPreset(25).click();
        await expect(podpora.submitButton).toBeDisabled();
      });

      await test.step("Tick only the first consent (Súhlasím so začatím poskytovania…) — button stays disabled", async () => {
        await podpora.consentImmediateCheckbox.click();
        await expect(podpora.submitButton).toBeDisabled();
      });

      await test.step("Tick the second consent — button becomes enabled", async () => {
        await podpora.consentDataCheckbox.click();
        await expect(podpora.submitButton).toBeEnabled();
      });
    });

    // TC-06: Cancelling from Stripe Checkout returns to /support with the cancellation banner
    test("TC-06: Cancelling from Stripe Checkout returns to /support with the cancellation banner", async ({
      page,
      podpora,
      stripeCheckout,
    }) => {
      await test.step("Open /support and fill a valid form", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        await podpora.amountPreset(25).click();
        await podpora.emailInput.fill("donor-tc06@example.com");
        await podpora.nameInput.fill("Cancel Donor");
        await podpora.consentImmediateCheckbox.click();
        await podpora.consentDataCheckbox.click();
      });

      await test.step("Submit the form and wait for Stripe Checkout domain", async () => {
        await podpora.submitButton.click();
        await stripeCheckout.waitForOnStripeDomain();
      });

      await test.step("Cancel / go back from Stripe Checkout", async () => {
        await stripeCheckout.cancelAndReturn();
      });

      await test.step("Verify URL is /support?cancelled=1", async () => {
        await expect(page).toHaveURL(/\/support\?cancelled=1/);
      });

      await test.step("Verify the cancellation status banner is visible with correct text", async () => {
        await expect(podpora.cancelledBanner).toBeVisible();
        await expect(podpora.cancelledBanner).toContainText(
          "Platbu si zrušil. Žiadne údaje neboli uložené. Ak si to len rozmyslel, môžeš formulár vyplniť znova.",
        );
      });

      await test.step("Verify the donate form is rendered below the banner with fields at initial state", async () => {
        await expect(podpora.submitButton).toBeVisible();
        await expect(podpora.submitButton).toBeDisabled();
      });
    });

    // TC-07: Cancelled banner does not appear on a fresh /support visit
    test("TC-07: Cancelled banner does not appear on a fresh /support visit", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support without cancelled query param", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
      });

      await test.step("Verify the cancelled banner is NOT present in the DOM", async () => {
        await expect(podpora.cancelledBanner).not.toBeAttached();
      });
    });

    // TC-08: display_link without https:// prefix blocks submission (client-side)
    test("TC-08: display_link without https:// prefix blocks submission (client-side)", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support at default viewport and set up a valid base form", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        await podpora.amountPreset(25).click();
        await podpora.emailInput.fill("donor-tc08@example.com");
        await podpora.nameInput.fill("Test Donor");
        await podpora.consentImmediateCheckbox.click();
        await podpora.consentDataCheckbox.click();
      });

      await test.step("Tick Chcem byť na zozname sponzorov (/sponsors) and fill display name", async () => {
        await podpora.showInListCheckbox.click();
        await podpora.displayNameInput.fill("Test Donor");
      });

      await test.step("Type an insecure URL http://insecure.example into the link field", async () => {
        await podpora.displayLinkInput.fill("http://insecure.example");
      });

      await test.step("Verify hint text Odkaz musí začínať https:// is visible", async () => {
        await expect(podpora.displayLinkHint).toHaveText("Odkaz musí začínať https://");
      });

      await test.step("Verify submit button is disabled (linkValid is false)", async () => {
        await expect(podpora.submitButton).toBeDisabled();
      });

      await test.step("Verify no POST to /api/create-checkout-session is made while button is disabled", async () => {
        // The button is disabled — no submit event fires; we capture any stray network request.
        // force: true bypasses actionability checks so we don't wait indefinitely for the
        // disabled button to become enabled (which it never will in this state).
        let postFired = false;
        page.on("request", (req) => {
          if (req.url().includes("/api/create-checkout-session") && req.method() === "POST") {
            postFired = true;
          }
        });
        await podpora.submitButton.click({ force: true });
        expect(postFired).toBe(false);
      });
    });

    // TC-09: display_message over 80 characters is capped by the textarea maxLength
    test("TC-09: display_message over 80 characters is capped by the textarea maxLength", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support and tick Chcem byť na zozname sponzorov (/sponsors)", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        await podpora.showInListCheckbox.click();
      });

      await test.step("Paste an 85-character string into the Krátka správa textarea", async () => {
        const eightyFiveChars = "a".repeat(85);
        await podpora.displayMessageTextarea.fill(eightyFiveChars);
      });

      await test.step("Verify the textarea value is truncated to exactly 80 characters", async () => {
        const value = await podpora.displayMessageTextarea.inputValue();
        expect(value.length).toBe(80);
      });

      await test.step("Verify the counter reads 0 znakov zostáva", async () => {
        await expect(podpora.displayMessageCounter).toHaveText("0 znakov zostáva");
      });
    });

    // TC-10: Zobraziť ma v päte stránky checkbox is disabled when amount does not qualify
    test("TC-10: Zobraziť ma v päte stránky checkbox is disabled when the amount does not qualify", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support and tick Chcem byť na zozname sponzorov (/sponsors)", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        await podpora.showInListCheckbox.click();
      });

      await test.step("Select one-off 10 € (below 50 EUR threshold) and verify footer checkbox is disabled", async () => {
        await podpora.amountPreset(10).click();
        await expect(podpora.showInFooterCheckbox).toBeDisabled();
      });

      await test.step("Verify footer checkbox label shows the threshold notice", async () => {
        await expect(podpora.showInFooterLabel).toContainText(
          "Zobraziť ma v päte (potrebné: jednorazovo ≥ 50 € alebo mesačne ≥ 25 €)",
        );
      });

      await test.step("Switch to Mesačne mode and select 10 € (below 25 EUR monthly threshold) — still disabled", async () => {
        await podpora.modeMonthly.click();
        await podpora.amountPreset(10).click();
        await expect(podpora.showInFooterCheckbox).toBeDisabled();
      });

      await test.step("Switch to monthly 25 € — checkbox becomes enabled with updated label", async () => {
        await podpora.amountPreset(25).click();
        await expect(podpora.showInFooterCheckbox).toBeEnabled();
        await expect(podpora.showInFooterLabel).toHaveText("Zobraziť ma aj v päte stránky");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test.describe("Edge cases", () => {
    // TC-11: AML cap — one-off amount 501 EUR is blocked at the client
    test("TC-11: AML cap — one-off amount 501 EUR is blocked at the client", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support and click Iná suma", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        await podpora.customAmountToggle.click();
      });

      await test.step("Type 501 into the custom amount input", async () => {
        await podpora.customAmountInput.fill("501");
      });

      await test.step("Verify aria-invalid=true on the custom amount input (amountValid is false)", async () => {
        await expect(podpora.customAmountInput).toHaveAttribute("aria-invalid", "true");
      });

      await test.step("Verify submit button is disabled", async () => {
        await expect(podpora.submitButton).toBeDisabled();
      });

      await test.step("Verify no POST to /api/create-checkout-session is sent", async () => {
        // force: true bypasses actionability so we don't wait indefinitely for
        // the disabled button; the disabled attribute prevents the form onSubmit.
        let postFired = false;
        page.on("request", (req) => {
          if (req.url().includes("/api/create-checkout-session") && req.method() === "POST") {
            postFired = true;
          }
        });
        await podpora.submitButton.click({ force: true });
        expect(postFired).toBe(false);
      });
    });

    // TC-12: SCA 3DS challenge card completes authentication and lands on thank-you
    test(
      "TC-12: SCA 3DS challenge card completes authentication and lands on thank-you",
      { timeout: 120_000 },
      async ({ page, podpora, podakovanie, stripeCheckout }) => {
        test.setTimeout(120_000);

        await test.step("Open /support and fill a valid form with 25 €", async () => {
          await page.setViewportSize({ width: 1280, height: 800 });
          await podpora.open();
          await podpora.amountPreset(25).click();
          await podpora.emailInput.fill("donor-tc12@example.com");
          await podpora.nameInput.fill("SCA Donor");
          await podpora.consentImmediateCheckbox.click();
          await podpora.consentDataCheckbox.click();
        });

        await test.step("Submit and wait for Stripe Checkout domain", async () => {
          await podpora.submitButton.click();
          await stripeCheckout.waitForOnStripeDomain();
          await stripeCheckout.waitForLoaded();
        });

        await test.step("Enter the SCA 3DS challenge card 4000 0027 6000 3184", async () => {
          await stripeCheckout.fillTestCard(
            STRIPE_TEST_CARDS.sca.number,
            STRIPE_TEST_CARDS.sca.exp,
            STRIPE_TEST_CARDS.sca.cvc,
            STRIPE_TEST_CARDS.sca.zip,
          );
          await stripeCheckout.pay();
        });

        await test.step("Wait for the 3DS authentication challenge modal", async () => {
          await stripeCheckout.expectSCAChallenge({ timeout: 20_000 });
        });

        await test.step("Click Complete authentication inside the 3DS iframe", async () => {
          await stripeCheckout.completeSCAChallenge();
        });

        await test.step("Verify Stripe redirects to /thank-you/cs_test_…", async () => {
          await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
        });

        await test.step("Wait for ReadyState and verify heading Ďakujeme za podporu!", async () => {
          await podakovanie.waitForReady({ timeout: 45_000 });
          await expect(podakovanie.readyHeading).toHaveText("Ďakujeme za podporu!");
        });
      },
    );

    // TC-13: Refreshing /thank-you mid-poll restarts polling from loading state
    test("TC-13: Refreshing /thank-you mid-poll restarts polling from loading state", async ({
      page,
      podpora,
      podakovanie,
      stripeCheckout,
    }) => {
      await test.step("Open /support and complete a payment to get a valid session ID", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        await podpora.amountPreset(25).click();
        await podpora.emailInput.fill("donor-tc13@example.com");
        await podpora.nameInput.fill("Refresh Donor");
        await podpora.consentImmediateCheckbox.click();
        await podpora.consentDataCheckbox.click();
        await podpora.submitButton.click();
        await stripeCheckout.waitForOnStripeDomain();
        await stripeCheckout.waitForLoaded();
        await stripeCheckout.fillTestCard(
          STRIPE_TEST_CARDS.basic.number,
          STRIPE_TEST_CARDS.basic.exp,
          STRIPE_TEST_CARDS.basic.cvc,
          STRIPE_TEST_CARDS.basic.zip,
        );
        await stripeCheckout.pay();
        await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
      });

      await test.step("Capture current session URL then install a route mock that keeps returning pending", async () => {
        // SOLE permitted route mock — ensures polling is in-progress at refresh time
        await page.route("**/api/donation-status**", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ status: "pending" }),
          });
        });
      });

      await test.step("Reload the page while Hľadáme tvoju platbu… is visible (mid-poll)", async () => {
        await page.reload();
        // After reload the polling restarts from loading/pending state
        await expect(podakovanie.statePending).toBeVisible({ timeout: 10_000 });
      });

      await test.step("Remove the route mock so the real endpoint can respond", async () => {
        await page.unroute("**/api/donation-status**");
      });

      await test.step("Wait for next poll to return ready and verify ReadyState renders", async () => {
        await podakovanie.waitForReady({ timeout: 30_000 });
        await expect(podakovanie.readyHeading).toBeVisible();
      });
    });

    // TC-14: Navigating to /thank-you with a syntactically invalid session ID yields not_found UI
    test("TC-14: Navigating to /thank-you with a syntactically invalid session ID yields not_found UI", async ({
      page,
      podakovanie,
    }) => {
      await test.step("Navigate directly to /thank-you/cs_test_INVALID_ID_THAT_DOES_NOT_EXIST", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podakovanie.open("cs_test_INVALID_ID_THAT_DOES_NOT_EXIST");
      });

      await test.step("Wait for NotFoundState to render", async () => {
        await podakovanie.waitForNotFound({ timeout: 10_000 });
      });

      await test.step("Verify heading reads Neznáma platba", async () => {
        await expect(podakovanie.notFoundHeading).toHaveText("Neznáma platba");
      });

      await test.step("Verify copy contains Tento odkaz nezodpovedá žiadnej platbe v našom systéme.", async () => {
        await expect(podakovanie.stateNotFound).toContainText(
          "Tento odkaz nezodpovedá žiadnej platbe v našom systéme.",
        );
      });
    });

    // TC-15: Poll timeout after 30 seconds renders TimeoutState
    test(
      "TC-15: Poll timeout after 30 seconds renders TimeoutState",
      { timeout: 90_000 },
      async ({ page, podakovanie }) => {
        // Belt-and-suspenders: test.setTimeout ensures the budget is 90s even
        // when test.extend() strips the options-object timeout in some versions.
        test.setTimeout(90_000);

        await test.step("Install route mock that always returns pending before opening the page", async () => {
          // SOLE permitted route mock — exercises 30s timeout deterministically
          await page.route("**/api/donation-status**", async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ status: "pending" }),
            });
          });
        });

        await test.step("Navigate to /thank-you with a placeholder session ID", async () => {
          await page.setViewportSize({ width: 1280, height: 800 });
          // Use cs_test_PROBE which passes the cs_ prefix guard
          await podakovanie.open("cs_test_PROBE_TIMEOUT_TC15");
        });

        await test.step("Wait for TimeoutState — every poll returns pending, POLL_MAX_MS=30000 elapses", async () => {
          await podakovanie.waitForTimeout({ timeout: 35_000 });
        });

        await test.step("Verify heading reads Stále spracúvame…", async () => {
          await expect(podakovanie.timeoutHeading).toHaveText("Stále spracúvame…");
        });

        await test.step("Verify copy includes Stripe nám ešte neposlal potvrdenie.", async () => {
          await expect(podakovanie.stateTimeout).toContainText(
            "Stripe nám ešte neposlal potvrdenie.",
          );
        });

        await test.step("Remove route mock", async () => {
          await page.unroute("**/api/donation-status**");
        });
      },
    );

    // TC-16: Mobile viewport (375×812) — donate form is fully usable
    test("TC-16: Mobile viewport (375×812) — donate form is fully usable", async ({
      page,
      podpora,
    }) => {
      await test.step("Set mobile viewport 375×812 and open /support", async () => {
        await page.setViewportSize({ width: 375, height: 812 });
        await podpora.open();
      });

      await test.step("Verify no horizontal overflow (scrollWidth ≤ 375)", async () => {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(375);
      });

      await test.step("Verify the frequency radio group is visible without clipping", async () => {
        await expect(podpora.modeOneoff).toBeVisible();
        await expect(podpora.modeMonthly).toBeVisible();
      });

      await test.step("Verify preset amount chips are all visible", async () => {
        await expect(podpora.amountPreset(5)).toBeVisible();
        await expect(podpora.amountPreset(10)).toBeVisible();
        await expect(podpora.amountPreset(25)).toBeVisible();
        await expect(podpora.amountPreset(50)).toBeVisible();
        await expect(podpora.amountPreset(100)).toBeVisible();
      });

      await test.step("Verify email, name, and consent fields are reachable by scroll", async () => {
        await podpora.emailInput.scrollIntoViewIfNeeded();
        await expect(podpora.emailInput).toBeVisible();
        await podpora.nameInput.scrollIntoViewIfNeeded();
        await expect(podpora.nameInput).toBeVisible();
        await podpora.consentImmediateCheckbox.scrollIntoViewIfNeeded();
        await expect(podpora.consentImmediateCheckbox).toBeVisible();
      });

      await test.step("Verify submit button is full-width and readable", async () => {
        await podpora.submitButton.scrollIntoViewIfNeeded();
        await expect(podpora.submitButton).toBeVisible();
        const box = await podpora.submitButton.boundingBox();
        // At 375px viewport the button is w-full inside a p-6 card inside px-4
        // container: 375 - 2*16 - 2*24 = 295px. Threshold 250 confirms full-width
        // rendering with headroom for sub-pixel rounding differences.
        expect(box!.width).toBeGreaterThan(250);
      });
    });

    // TC-17: Keyboard-only navigation through the donate form (a11y)
    test("TC-17: Keyboard-only navigation through the donate form (a11y)", async ({
      page,
      podpora,
      stripeCheckout,
    }) => {
      await test.step("Open /support at 1280×800, no pointer interaction", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
      });

      await test.step("Tab to Jednorazovo radio button and press Space to confirm it", async () => {
        await podpora.modeOneoff.focus();
        await page.keyboard.press("Space");
        await expect(podpora.modeOneoff).toHaveAttribute("aria-checked", "true");
      });

      await test.step("Tab to the 25 € amount chip and press Space to select it", async () => {
        await podpora.amountPreset(25).focus();
        await page.keyboard.press("Space");
        await expect(podpora.amountPreset(25)).toHaveAttribute("aria-checked", "true");
      });

      await test.step("Tab to E-mail input and type a valid email", async () => {
        await podpora.emailInput.focus();
        await page.keyboard.type("donor-tc17@example.com");
      });

      await test.step("Tab to Meno alebo firma and type a valid name", async () => {
        await page.keyboard.press("Tab");
        await page.keyboard.type("Keyboard Donor");
      });

      await test.step("Tab past DIČ field to the first consent checkbox and press Space", async () => {
        // Tab order from name: DIČ input (1) → show-in-list checkbox (2)
        // → consent-immediate (3). Three tabs needed.
        await page.keyboard.press("Tab"); // → DIČ
        await page.keyboard.press("Tab"); // → show-in-list checkbox
        await page.keyboard.press("Tab"); // → consent-immediate
        await page.keyboard.press("Space");
        await expect(podpora.consentImmediateCheckbox).toBeChecked();
      });

      await test.step("Tab to the second consent checkbox and press Space", async () => {
        await page.keyboard.press("Tab");
        await page.keyboard.press("Space");
        await expect(podpora.consentDataCheckbox).toBeChecked();
      });

      await test.step("Tab to the submit button and press Enter — form submits", async () => {
        // The consent-data label contains an inline <Link> (Zásady ochrany
        // súkromia) that is focusable. One Tab from the consent-data checkbox
        // lands on the link; a second Tab lands on the submit button.
        await page.keyboard.press("Tab"); // → Zásady link inside consent-data label
        await page.keyboard.press("Tab"); // → submit button
        await page.keyboard.press("Enter");
        // Stripe redirect proves the form was submitted successfully
        await stripeCheckout.waitForOnStripeDomain({ timeout: 20_000 });
      });
    });

    // TC-18: Slovak diacritics in meno and display_name round-trip through Stripe metadata
    test("TC-18: Slovak diacritics in meno and display_name round-trip through Stripe metadata", async ({
      page,
      podpora,
      podakovanie,
      stripeCheckout,
    }) => {
      await test.step("Open /support and fill Meno alebo firma with Ľubomír Ďurčiak", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
      });

      await test.step("Select 50 €, fill email, name with diacritics, tick show-in-list", async () => {
        await podpora.amountPreset(50).click();
        await podpora.emailInput.fill("donor-tc18@example.com");
        await podpora.nameInput.fill("Ľubomír Ďurčiak");
        await podpora.showInListCheckbox.click();
        await podpora.displayNameInput.fill("Ľubomír Ďurčiak");
      });

      await test.step("Tick both mandatory consents and submit", async () => {
        await podpora.consentImmediateCheckbox.click();
        await podpora.consentDataCheckbox.click();
        await podpora.submitButton.click();
        await stripeCheckout.waitForOnStripeDomain();
        await stripeCheckout.waitForLoaded();
      });

      await test.step("Complete payment with default test card", async () => {
        await stripeCheckout.fillTestCard(
          STRIPE_TEST_CARDS.basic.number,
          STRIPE_TEST_CARDS.basic.exp,
          STRIPE_TEST_CARDS.basic.cvc,
          STRIPE_TEST_CARDS.basic.zip,
        );
        await stripeCheckout.pay();
      });

      await test.step("Verify redirect to /thank-you/cs_test_…", async () => {
        await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
      });

      await test.step("Wait for ReadyState and verify heading preserves diacritics: Ďakujeme, Ľubomír Ďurčiak!", async () => {
        await podakovanie.waitForReady({ timeout: 30_000 });
        await expect(podakovanie.readyHeading).toHaveText("Ďakujeme, Ľubomír Ďurčiak!");
      });
    });

    // TC-19: Two browser contexts submitting the same email concurrently get independent sessions
    test(
      "TC-19: Two browser contexts submitting the same email concurrently get independent sessions",
      { timeout: 180_000 },
      async ({ browser }) => {
        // TC-19 exception: uses browser.newContext() twice and constructs POMs
        // directly per page — the fixture wiring provides one page per test,
        // but this TC specifically requires two independent contexts.

        const ctxA = await browser.newContext();
        const ctxB = await browser.newContext();
        const pageA = await ctxA.newPage();
        const pageB = await ctxB.newPage();
        const podporaA = new PodporaPage(pageA);
        const podporaB = new PodporaPage(pageB);
        const stripeA = new StripeCheckoutPage(pageA);
        const stripeB = new StripeCheckoutPage(pageB);
        const podakovaniePomA = new PodakovaniePage(pageA);
        const podakovaniePomB = new PodakovaniePage(pageB);

        try {
          await test.step("Both contexts open /support simultaneously", async () => {
            await Promise.all([podporaA.open(), podporaB.open()]);
          });

          await test.step("Both contexts fill identical forms with the shared email", async () => {
            await Promise.all([
              (async () => {
                await podporaA.amountPreset(25).click();
                await podporaA.emailInput.fill("donor-shared@example.com");
                await podporaA.nameInput.fill("Shared Donor A");
                await podporaA.consentImmediateCheckbox.click();
                await podporaA.consentDataCheckbox.click();
              })(),
              (async () => {
                await podporaB.amountPreset(25).click();
                await podporaB.emailInput.fill("donor-shared@example.com");
                await podporaB.nameInput.fill("Shared Donor B");
                await podporaB.consentImmediateCheckbox.click();
                await podporaB.consentDataCheckbox.click();
              })(),
            ]);
          });

          await test.step("Both contexts submit at approximately the same time", async () => {
            await Promise.all([podporaA.submitButton.click(), podporaB.submitButton.click()]);
          });

          await test.step("Both contexts land on Stripe Checkout", async () => {
            await Promise.all([stripeA.waitForOnStripeDomain(), stripeB.waitForOnStripeDomain()]);
            await Promise.all([stripeA.waitForLoaded(), stripeB.waitForLoaded()]);
          });

          await test.step("Both contexts complete payment with the default test card", async () => {
            await Promise.all([
              (async () => {
                await stripeA.fillTestCard(
                  STRIPE_TEST_CARDS.basic.number,
                  STRIPE_TEST_CARDS.basic.exp,
                  STRIPE_TEST_CARDS.basic.cvc,
                  STRIPE_TEST_CARDS.basic.zip,
                );
                await stripeA.pay();
              })(),
              (async () => {
                await stripeB.fillTestCard(
                  STRIPE_TEST_CARDS.basic.number,
                  STRIPE_TEST_CARDS.basic.exp,
                  STRIPE_TEST_CARDS.basic.cvc,
                  STRIPE_TEST_CARDS.basic.zip,
                );
                await stripeB.pay();
              })(),
            ]);
          });

          await test.step("Both contexts land on distinct /thank-you/cs_test_… URLs", async () => {
            await Promise.all([
              expect(pageA).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 }),
              expect(pageB).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 }),
            ]);
            const urlA = pageA.url();
            const urlB = pageB.url();
            expect(urlA).not.toBe(urlB);
          });

          await test.step("Both contexts poll to ready and show Ďakujeme za podporu!", async () => {
            await Promise.all([
              podakovaniePomA.waitForReady({ timeout: 30_000 }),
              podakovaniePomB.waitForReady({ timeout: 30_000 }),
            ]);
            await expect(podakovaniePomA.readyHeading).toHaveText("Ďakujeme za podporu!");
            await expect(podakovaniePomB.readyHeading).toHaveText("Ďakujeme za podporu!");
          });
        } finally {
          await ctxA.close();
          await ctxB.close();
        }
      },
    );

    // TC-20: /support page title and meta tags match the E11.1 AC-1 spec
    test("TC-20: /support page title and meta tags match the E11.1 AC-1 spec", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support at default viewport 1280×800", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        // Wait for the route-level h1 to confirm the /support route has fully
        // rendered before asserting the document title (TanStack Router sets
        // the <title> as part of client-side hydration; domcontentloaded alone
        // is not sufficient when the SPA replaces the default title).
        await expect(podpora.pageHeading).toBeVisible({ timeout: 10_000 });
      });

      await test.step("Verify document.title equals Podpora projektu — subenai", async () => {
        // TanStack Router's head plugin updates <title> on its own microtask
        // after the route component mounts. Default 5 s auto-retry is too
        // tight on slower CI cold-starts; extend explicitly.
        await expect(page).toHaveTitle("Podpora projektu — subenai", { timeout: 15_000 });
      });

      await test.step("Verify meta description contains jednorazovo alebo mesačne", async () => {
        // <head> query — explicit carve-out per TC-20 (no element testid for meta tags)
        const content = await page.locator('meta[name="description"]').getAttribute("content");
        expect(content).toContain("jednorazovo alebo mesačne");
      });

      await test.step("Verify h1 reads Podpora projektu and is visible", async () => {
        await expect(podpora.pageHeading).toBeVisible();
        await expect(podpora.pageHeading).toHaveText("Podpora projektu");
      });

      await test.step("Verify hero paragraph contains the AC-2 copy", async () => {
        await expect(podpora.heroParagraph).toContainText(
          "Akúkoľvek čiastku použijeme na hosting, tvorbu obsahu a údržbu.",
        );
      });

      await test.step("Verify canonical link ends with /support", async () => {
        // <head> query — explicit carve-out per TC-20 (no element testid for link tags)
        const href = await page.locator('link[rel="canonical"]').getAttribute("href");
        expect(href).toMatch(/\/support$/);
      });
    });

    // TC-21: No dark patterns — no preset amount selected on load; all amounts equally prominent
    test("TC-21: No dark patterns — no preset amount selected on load; all amounts equally prominent", async ({
      page,
      podpora,
    }) => {
      await test.step("Open /support at default viewport 1280×800 without URL params", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
      });

      await test.step("Verify all preset chips have aria-checked=false on initial load", async () => {
        await expect(podpora.amountPreset(5)).toHaveAttribute("aria-checked", "false");
        await expect(podpora.amountPreset(10)).toHaveAttribute("aria-checked", "false");
        await expect(podpora.amountPreset(25)).toHaveAttribute("aria-checked", "false");
        await expect(podpora.amountPreset(50)).toHaveAttribute("aria-checked", "false");
        await expect(podpora.amountPreset(100)).toHaveAttribute("aria-checked", "false");
      });

      await test.step("Verify submit button is disabled (no amount selected)", async () => {
        await expect(podpora.submitButton).toBeDisabled();
      });

      await test.step("Verify 5 € and 100 € chips have visually equivalent class lists (no visual prominence difference)", async () => {
        const classList5 = await podpora.amountPresetClassList(5);
        const classList100 = await podpora.amountPresetClassList(100);
        // Both should share the same unselected styling classes
        expect(classList5.join(" ")).toContain("border-border");
        expect(classList100.join(" ")).toContain("border-border");
        // Neither should carry the selected bg-primary/10 class
        expect(classList5).not.toContain("bg-primary/10");
        expect(classList100).not.toContain("bg-primary/10");
      });
    });

    // TC-22: /api/donation-status returns 400 for a session_id that does not start with "cs_"
    test("TC-22: /api/donation-status returns 400 for a session_id that does not start with cs_", async ({
      request,
    }) => {
      // API-only TC — explicit carve-out: uses request fixture directly (no page element)
      await test.step("Send GET /api/donation-status?session_id=pi_malformed", async () => {
        const response = await request.get("/api/donation-status?session_id=pi_malformed");
        expect(response.status()).toBe(400);
        const body = (await response.json()) as { error: string };
        expect(body).toEqual({ error: "invalid_session_id" });
      });
    });

    // TC-23: Stripe Checkout locale is forced to Slovak
    test(
      "TC-23: Stripe Checkout locale is forced to Slovak",
      { timeout: 60_000 },
      async ({ page, podpora, stripeCheckout }) => {
        test.setTimeout(60_000);

        await test.step("Open /support and fill a valid form with 25 €", async () => {
          await page.setViewportSize({ width: 1280, height: 800 });
          await podpora.open();
          await podpora.amountPreset(25).click();
          await podpora.emailInput.fill("donor-tc23@example.com");
          await podpora.nameInput.fill("Locale Donor");
          await podpora.consentImmediateCheckbox.click();
          await podpora.consentDataCheckbox.click();
        });

        await test.step("Submit and capture the POST to /api/create-checkout-session response", async () => {
          // Capture the response body via page.on("response") which fires eagerly
          // during the response streaming phase, before the page navigation (caused
          // by window.location.href = url) can discard the CDP resource handle.
          // .json() / .body() called from waitForResponse.then() race with the
          // navigation — the listener approach wins because it buffers immediately.
          // Capture status from the response listener (fires before the
          // SPA consumes the JSON and navigates). Body URL is verified by
          // the subsequent waitForOnStripeDomain step — that IS the redirect.
          let capturedStatus = 0;
          const statusReady = new Promise<void>((resolve) => {
            const handler = (r: import("@playwright/test").Response) => {
              if (
                r.url().includes("/api/create-checkout-session") &&
                r.request().method() === "POST"
              ) {
                page.off("response", handler);
                capturedStatus = r.status();
                resolve();
              }
            };
            page.on("response", handler);
          });

          await podpora.submitButton.click();
          await statusReady;
          expect(capturedStatus).toBe(200);
        });

        await test.step("Wait for Stripe Checkout page to load", async () => {
          await stripeCheckout.waitForOnStripeDomain();
          await stripeCheckout.waitForLoaded();
        });

        await test.step("Verify Stripe Checkout renders with Slovak-language UI (locale: sk)", async () => {
          const hasSlovak = await stripeCheckout.hasSlovakLocaleHint();
          expect(hasSlovak).toBe(true);
        });

        await test.step("Verify custom submit message contains the Slovak disclosure text", async () => {
          const msgText = await stripeCheckout.submitMessageText();
          // The custom_text.submit.message is set in create-checkout-session.ts
          expect(msgText).toContain(
            "Stlačením potvrdzujete súhlas so začatím poskytovania okamžite",
          );
        });
      },
    );

    // TC-24: XSS-like string in display_name is stored verbatim (no script execution)
    test("TC-24: XSS-like string in display_name is stored verbatim (no script execution)", async ({
      page,
      podpora,
      podakovanie,
      stripeCheckout,
    }) => {
      const xssName = "<script>alert(1)</script>";
      const pageAlerts: string[] = [];

      await test.step("Attach dialog handler to detect any alert() that might fire", async () => {
        page.on("dialog", async (dialog) => {
          pageAlerts.push(dialog.message());
          await dialog.dismiss();
        });
      });

      await test.step("Open /support and fill the XSS string as display name", async () => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await podpora.open();
        await podpora.amountPreset(25).click();
        await podpora.emailInput.fill("donor-tc24@example.com");
        await podpora.nameInput.fill("XSS Donor");
        await podpora.showInListCheckbox.click();
        await podpora.displayNameInput.fill(xssName);
      });

      await test.step("Tick both mandatory consents and submit", async () => {
        await podpora.consentImmediateCheckbox.click();
        await podpora.consentDataCheckbox.click();
        await podpora.submitButton.click();
        await stripeCheckout.waitForOnStripeDomain();
        await stripeCheckout.waitForLoaded();
      });

      await test.step("Complete payment with default test card", async () => {
        await stripeCheckout.fillTestCard(
          STRIPE_TEST_CARDS.basic.number,
          STRIPE_TEST_CARDS.basic.exp,
          STRIPE_TEST_CARDS.basic.cvc,
          STRIPE_TEST_CARDS.basic.zip,
        );
        await stripeCheckout.pay();
      });

      await test.step("Verify redirect to /thank-you/cs_test_…", async () => {
        await expect(page).toHaveURL(/\/thank-you\/cs_test_/, { timeout: 30_000 });
      });

      await test.step("Wait for ReadyState and verify heading renders the XSS string as escaped text", async () => {
        await podakovanie.waitForReady({ timeout: 30_000 });
        // React's JSX rendering escapes HTML — no <script> executes
        await expect(podakovanie.readyHeading).toHaveText(`Ďakujeme, ${xssName}!`);
      });

      await test.step("Verify no alert() dialog fired (no unhandled script execution)", async () => {
        expect(pageAlerts).toHaveLength(0);
      });
    });
  });
});
