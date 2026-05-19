import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminHeaderPage } from "../../poms/admin/AdminHeaderPage";

const CMS_HEADER_TABLE = [
  {
    id: 1,
    logo: "",
    nav: { cta_label: "", cta_url: "", mobile_trigger_label: "" },
  },
];

test.describe("/admin/header", () => {
  // TC-01: Page renders the form with all four inputs and the save button
  test("TC-01: page renders form root with all four inputs and the save button", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { cms_header: CMS_HEADER_TABLE } });
    const header = new AdminHeaderPage(page);

    await test.step("Navigate to /admin/header", async () => {
      await header.open();
    });

    await test.step("Verify the form root is visible", async () => {
      await expect(header.root).toBeVisible();
    });

    await test.step("Verify the logo URL input is visible", async () => {
      await expect(header.logoInput).toBeVisible();
    });

    await test.step("Verify the CTA label input is visible", async () => {
      await expect(header.ctaLabelInput).toBeVisible();
    });

    await test.step("Verify the CTA URL input is visible", async () => {
      await expect(header.ctaUrlInput).toBeVisible();
    });

    await test.step("Verify the mobile trigger label input is visible", async () => {
      await expect(header.mobileInput).toBeVisible();
    });

    await test.step("Verify the save button is visible and enabled", async () => {
      await expect(header.saveButton).toBeVisible();
      await expect(header.saveButton).toBeEnabled();
    });
  });

  // TC-02: Edit fields and submit → success toast fires
  test("TC-02: editing fields and submitting the form shows the success toast", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { cms_header: CMS_HEADER_TABLE } });
    const header = new AdminHeaderPage(page);

    await test.step("Navigate to /admin/header", async () => {
      await header.open();
      await expect(header.root).toBeVisible();
    });

    await test.step("Clear the logo URL input and type a new URL", async () => {
      await header.logoInput.fill("https://new.example.com/logo.png");
    });

    await test.step("Clear the CTA label input and type a new label", async () => {
      await header.ctaLabelInput.fill("Nový CTA");
    });

    await test.step("Click the save button", async () => {
      await header.submit();
    });

    await test.step('Verify the success toast "Hlavička uložená." appears', async () => {
      await expect(header.toast).toBeVisible({ timeout: 4000 });
      await expect(header.toast).toContainText("Hlavička uložená.");
    });
  });

  // TC-03: Mutation error → error toast fires
  test("TC-03: a PATCH failure on cms_header shows an error toast", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { cms_header: CMS_HEADER_TABLE } });

    await page.route("**/rest/v1/cms_header*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "internal_error",
            message: "Simulated header save failure",
            details: null,
            hint: null,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    const header = new AdminHeaderPage(page);

    await test.step("Navigate to /admin/header", async () => {
      await header.open();
      await expect(header.root).toBeVisible();
    });

    await test.step("Type into the logo URL input to trigger the optimistic mutation", async () => {
      await header.logoInput.fill("https://trigger-error.example.com/logo.png");
    });

    await test.step("Verify an error toast appears within 4 s", async () => {
      await expect(header.toast).toBeVisible({ timeout: 4000 });
    });
  });
});
