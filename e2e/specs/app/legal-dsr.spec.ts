import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppLegalDsrPage } from "../../poms/app/AppLegalDsrPage";

test.describe("/app/legal/dsr — GDPR data subject request page", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, { tables: { dsr_requests: [] } });
  });

  // TC-01: Page renders with title, subtitle, form card, submit button, and empty history
  test("TC-01: page renders with title, subtitle, form card, and empty history", async ({
    page,
  }) => {
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Verify page root is visible", async () => {
      await expect(dsr.root).toBeVisible();
    });

    await test.step("Verify heading reads 'GDPR žiadosť (DSR)'", async () => {
      await expect(dsr.title).toHaveText("GDPR žiadosť (DSR)");
    });

    await test.step("Verify subtitle reads the SLA line", async () => {
      await expect(dsr.subtitle).toHaveText(
        "Prístup k údajom · Výmaz · Portabilita · Obmedzenie · Námietka · SLA 30 dní.",
      );
    });

    await test.step("Verify submit form card and submit button are visible", async () => {
      await expect(dsr.formCard).toBeVisible();
      await expect(dsr.submitButton).toBeVisible();
    });

    await test.step("Verify history card shows the empty-state message", async () => {
      await expect(dsr.historyCard).toBeVisible();
      await expect(dsr.historyEmpty).toHaveText("Zatiaľ nie sú žiadne žiadosti.");
    });
  });

  // TC-02: Submitting a valid access request shows the success banner
  test("TC-02: submitting a valid access request shows success banner and clears the email", async ({
    page,
  }) => {
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Fill the email field with a valid address", async () => {
      await dsr.emailInput.fill("test@example.sk");
    });

    await test.step("Click the 'Podať žiadosť' submit button", async () => {
      await dsr.submitButton.click();
    });

    await test.step("Verify the success banner appears with the confirmation message", async () => {
      await expect(dsr.successBanner).toBeVisible();
      await expect(dsr.successBanner).toHaveText("Žiadosť bola podaná — odpovieme do 30 dní.");
    });

    await test.step("Verify the email field is cleared after submission", async () => {
      await expect(dsr.emailInput).toHaveValue("");
    });
  });

  // TC-03: Submitting with an invalid email shows an inline validation error
  test("TC-03: submitting with an invalid email shows validation error and no success banner", async ({
    page,
  }) => {
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Type an invalid email into the email field", async () => {
      await dsr.emailInput.fill("not-an-email");
    });

    await test.step("Click the 'Podať žiadosť' submit button", async () => {
      await dsr.submitButton.click();
    });

    await test.step("Verify the error banner appears with the invalid-email message", async () => {
      await expect(dsr.errorBanner).toBeVisible();
      await expect(dsr.errorBanner).toHaveText("Neplatný e-mail.");
    });

    await test.step("Verify the success banner is absent", async () => {
      await expect(dsr.successBanner).toHaveCount(0);
    });
  });
});
