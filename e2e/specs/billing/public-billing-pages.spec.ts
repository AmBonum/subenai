import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { stubVerifyEvidenceReport } from "../../mocks/api/verify-evidence-report";
import type { PaidPlanId, PricingPlanId } from "../../poms/billing/PricingPage";

const REPORT_ID = "7d1f0c2e-4b8a-4f61-9c3e-2a5b6d7e8f90";
const NIL_REPORT_ID = "00000000-0000-4000-8000-000000000000";
const SHA256 = "a3f5c8d1e2b4f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f";

const PLAN_CARDS: PricingPlanId[] = ["free", "start", "firma", "firma_plus", "custom"];
const PAID_PRICES: Array<[PaidPlanId, string]> = [
  ["start", "149"],
  ["firma", "390"],
  ["firma_plus", "790"],
];

test.describe("Paid plans — public pages", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  // TC-01: Pricing page lists the free tier, three paid plans and the custom tier
  test("TC-01: Pricing page lists the free tier, three paid plans and the custom tier", async ({
    page,
    pricing,
  }) => {
    await test.step("Set up an anonymous session at 1280×800 and open /cennik", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await pricing.open();
    });

    await test.step("Verify the pricing title is visible", async () => {
      await expect(pricing.title).toBeVisible();
      await expect(pricing.title).toHaveText("Doklad o preškolení zamestnancov bez drahého LMS");
    });

    await test.step("Verify all five plan cards are visible", async () => {
      for (const id of PLAN_CARDS) {
        await expect(pricing.planCard(id)).toBeVisible();
      }
    });

    await test.step("Verify the prices read 149, 390 and 790", async () => {
      for (const [id, price] of PAID_PRICES) {
        await expect(pricing.planPrice(id)).toContainText(price);
      }
    });

    await test.step("Verify the Firma card shows its recommended badge", async () => {
      await expect(pricing.planBadge("firma")).toBeVisible();
      await expect(pricing.planBadge("firma")).toHaveText("Najčastejšia voľba");
    });

    await test.step("Verify each paid CTA links to /app/billing?plan=<id>", async () => {
      for (const [id] of PAID_PRICES) {
        await expect(pricing.planCta(id)).toHaveAttribute("href", `/app/billing?plan=${id}`);
      }
    });
  });

  // TC-02: Cancelled checkout shows a status banner
  test("TC-02: Cancelled checkout shows a status banner", async ({ pricing }) => {
    await test.step("Open /cennik?checkout=cancelled", async () => {
      await pricing.open("?checkout=cancelled");
    });

    await test.step("Verify the cancelled-payment banner is visible with its message", async () => {
      await expect(pricing.checkoutCancelledBanner).toBeVisible();
      await expect(pricing.checkoutCancelledBanner).toHaveText(
        "Platba bola zrušená. Plán si môžete vybrať kedykoľvek znova.",
      );
    });

    await test.step("Open /cennik without the parameter", async () => {
      await pricing.open();
      await expect(pricing.title).toBeVisible();
    });

    await test.step("Verify no cancelled-payment banner is shown", async () => {
      await expect(pricing.checkoutCancelledBanner).toHaveCount(0);
    });
  });

  // TC-03: Terms of sale render all nine sections and are reachable from the footer
  test("TC-03: Terms of sale render all nine sections and are reachable from the footer", async ({
    page,
    footer,
    terms,
    pricing,
  }) => {
    await test.step("Set up an anonymous session and open the home page", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
    });

    await test.step("Click the footer link 'Obchodné podmienky' in the legal column", async () => {
      await expect(footer.columnPravne).toBeVisible();
      await expect(footer.navLink("obchodne-podmienky")).toHaveText("Obchodné podmienky");
      await footer.navLink("obchodne-podmienky").click();
    });

    await test.step("Verify the URL is /obchodne-podmienky", async () => {
      await expect(page).toHaveURL(/\/obchodne-podmienky$/);
    });

    await test.step("Verify the heading and the effective date are visible", async () => {
      await expect(terms.heading).toHaveText("Obchodné podmienky platených plánov");
      await expect(terms.effective).toHaveText("Účinné od 12. 10. 2026");
    });

    await test.step("Verify the nine section headings are visible in order", async () => {
      await expect(terms.sectionHeadings).toHaveText([
        "1. Úvodné ustanovenia",
        "2. Predmet zmluvy",
        "3. Objednávka a uzavretie zmluvy",
        "4. Cena a platobné podmienky",
        "5. Trvanie, obnovenie a zrušenie",
        "6. Odstúpenie od zmluvy",
        "7. Reklamácie a riešenie sporov",
        "8. Zodpovednosť a osobné údaje",
        "9. Záverečné ustanovenia",
      ]);
    });

    await test.step("Verify section 1 contains the company ID and no placeholder remains", async () => {
      await expect(terms.section("uvod")).toContainText("IČO: 55 055 290");
      await expect(terms.main).not.toContainText("{email}");
    });

    await test.step("Click the back link and verify it leads to /cennik", async () => {
      await terms.backLink.click();
      await expect(page).toHaveURL(/\/cennik$/);
      await expect(pricing.title).toBeVisible();
    });
  });

  // TC-04: Verification of a genuine report
  test("TC-04: Verification of a genuine report", async ({ page, evidenceVerify }) => {
    await test.step("Mock verify_evidence_report to return one genuine report row", async () => {
      await stubVerifyEvidenceReport(page, {
        status: 200,
        rows: [
          {
            org_name: "Firma s. r. o.",
            test_title: "Phishing 2026",
            test_version: 3,
            created_at: "2026-10-01T09:00:00Z",
            respondent_count: 12,
            passed_count: 10,
            content_sha256: SHA256,
          },
        ],
      });
    });

    await test.step("Open /overenie/<report id>", async () => {
      await evidenceVerify.open(REPORT_ID);
    });

    await test.step("Verify the report is shown as genuine with organisation and hash", async () => {
      await expect(evidenceVerify.valid).toBeVisible();
      await expect(evidenceVerify.valid).toContainText("Doklad je pravý");
      await expect(evidenceVerify.org).toHaveText("Firma s. r. o.");
      await expect(evidenceVerify.hash).toHaveText(SHA256);
    });
  });

  // TC-05: Paid-plan CTA keeps the destination through sign-in
  test("TC-05: Paid-plan CTA keeps the destination through sign-in", async ({ page, pricing }) => {
    await test.step("Set up an anonymous session and open /cennik", async () => {
      await pricing.open();
      await expect(pricing.planCta("firma")).toBeVisible();
    });

    await test.step("Click the Firma CTA", async () => {
      await pricing.planCta("firma").click();
    });

    await test.step("Verify the visitor lands on /login with redirect=/app/billing?plan=firma", async () => {
      await expect(page).toHaveURL(/\/login\?/);
      const redirect = new URL(page.url()).searchParams.get("redirect");
      expect(redirect).toBe("/app/billing?plan=firma");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // TC-06: Malformed report id never calls the RPC
  test("TC-06: Malformed report id never calls the RPC", async ({ page, evidenceVerify }) => {
    let rpc: Awaited<ReturnType<typeof stubVerifyEvidenceReport>>;

    await test.step("Mock verify_evidence_report and count its requests", async () => {
      rpc = await stubVerifyEvidenceReport(page, { status: 200, rows: [] });
    });

    await test.step("Open /overenie/not-a-uuid", async () => {
      await evidenceVerify.open("not-a-uuid");
    });

    await test.step("Verify the 'Doklad sa nenašiel' state is shown", async () => {
      await expect(evidenceVerify.invalid).toBeVisible();
      await expect(evidenceVerify.invalid).toContainText("Doklad sa nenašiel");
    });

    await test.step("Verify no request to verify_evidence_report was made", async () => {
      expect(rpc.callCount()).toBe(0);
    });
  });

  // TC-07: Unknown report id
  test("TC-07: Unknown report id", async ({ page, evidenceVerify }) => {
    await test.step("Mock verify_evidence_report to return an empty list", async () => {
      await stubVerifyEvidenceReport(page, { status: 200, rows: [] });
    });

    await test.step("Open /overenie/<unknown id>", async () => {
      await evidenceVerify.open(NIL_REPORT_ID);
    });

    await test.step("Verify the 'Doklad sa nenašiel' state is shown", async () => {
      await expect(evidenceVerify.invalid).toBeVisible();
      await expect(evidenceVerify.invalid).toContainText("Doklad sa nenašiel");
    });
  });

  // TC-08: RPC failure surfaces an error, not a false "invalid"
  test("TC-08: RPC failure surfaces an error, not a false 'invalid'", async ({
    page,
    evidenceVerify,
  }) => {
    await test.step("Mock verify_evidence_report to respond 500", async () => {
      await stubVerifyEvidenceReport(page, { status: 500 });
    });

    await test.step("Open /overenie/<report id>", async () => {
      await evidenceVerify.open(REPORT_ID);
    });

    await test.step("Verify the error alert is visible", async () => {
      await expect(evidenceVerify.error).toBeVisible({ timeout: 15_000 });
      await expect(evidenceVerify.error).toHaveAttribute("role", "alert");
    });

    await test.step("Verify neither the valid nor the invalid state is shown", async () => {
      await expect(evidenceVerify.valid).toHaveCount(0);
      await expect(evidenceVerify.invalid).toHaveCount(0);
    });
  });

  // TC-09: Pricing and terms fit a phone screen
  test("TC-09: Pricing and terms fit a phone screen", async ({ page, pricing, terms }) => {
    await test.step("Set viewport 375×812 and open /cennik", async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      await pricing.open();
      await expect(pricing.title).toBeVisible();
    });

    await test.step("Verify /cennik has no horizontal scroll", async () => {
      expect(await pricing.hasHorizontalOverflow()).toBe(false);
    });

    await test.step("Verify every plan card is visible after scrolling into view", async () => {
      for (const id of PLAN_CARDS) {
        await pricing.planCard(id).scrollIntoViewIfNeeded();
        await expect(pricing.planCard(id)).toBeVisible();
      }
    });

    await test.step("Open /obchodne-podmienky", async () => {
      await terms.open();
      await expect(terms.heading).toBeVisible();
    });

    await test.step("Verify /obchodne-podmienky has no horizontal scroll", async () => {
      expect(await terms.hasHorizontalOverflow()).toBe(false);
    });
  });
});
