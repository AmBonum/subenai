import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminSupportPage } from "../../poms/admin/AdminSupportPage";

test.describe("/admin/support", () => {
  // TC-01: Page renders root, form fields, and channel list
  test("TC-01: page renders root, form fields, and channel list with defaults", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page);
    const support = new AdminSupportPage(page);

    await test.step("Navigate to /admin/support", async () => {
      await support.open();
    });

    await test.step("Verify the page root is visible", async () => {
      await expect(support.root).toBeVisible();
    });

    await test.step("Verify the form is visible", async () => {
      await expect(support.form).toBeVisible();
    });

    await test.step("Verify all three input fields are visible", async () => {
      await expect(support.emailInput).toBeVisible();
      await expect(support.phoneInput).toBeVisible();
      await expect(support.hoursInput).toBeVisible();
    });

    await test.step("Verify the submit button is visible and enabled", async () => {
      await expect(support.submitButton).toBeVisible();
      await expect(support.submitButton).toBeEnabled();
    });

    await test.step("Verify the channel list is visible and contains the default email", async () => {
      await expect(support.channelList).toBeVisible();
      await expect(support.channelList).toContainText("subenai.podpora@gmail.com");
    });
  });

  // TC-02: Submitting valid data updates the channel list and shows the success toast
  test("TC-02: submitting valid data updates the channel list and shows the success toast", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page);
    const support = new AdminSupportPage(page);

    await test.step("Navigate to /admin/support and confirm the form is visible", async () => {
      await support.open();
      await expect(support.form).toBeVisible();
    });

    await test.step("Clear the email input and type a new email address", async () => {
      await support.emailInput.clear();
      await support.emailInput.fill("nova@firma.sk");
    });

    await test.step("Clear the phone input and type a new phone number", async () => {
      await support.phoneInput.clear();
      await support.phoneInput.fill("+421 910 000 111");
    });

    await test.step('Click the submit button labelled "Uložiť zmeny"', async () => {
      await support.submit();
    });

    await test.step("Verify the success toast appears with the confirmation message", async () => {
      await expect(support.toast).toBeVisible({ timeout: 4000 });
      await expect(support.toast).toContainText("Kontaktné údaje boli aktualizované.");
    });

    await test.step("Verify the channel list reflects the updated email and phone", async () => {
      await expect(support.channelList).toContainText("nova@firma.sk");
      await expect(support.channelList).toContainText("+421 910 000 111");
    });
  });

  // TC-03: Submitting an invalid email and phone shows inline validation errors
  test("TC-03: submitting invalid email and phone shows inline validation errors", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page);
    const support = new AdminSupportPage(page);

    await test.step("Navigate to /admin/support and confirm the form is visible", async () => {
      await support.open();
      await expect(support.form).toBeVisible();
    });

    await test.step("Clear the email input and type an invalid email address", async () => {
      await support.emailInput.clear();
      await support.emailInput.fill("not-an-email");
    });

    await test.step("Clear the phone input and type an invalid phone number", async () => {
      await support.phoneInput.clear();
      await support.phoneInput.fill("abc");
    });

    await test.step("Click the submit button", async () => {
      await support.submit();
    });

    await test.step("Verify the email error message is visible with the correct text", async () => {
      await expect(support.emailError).toBeVisible();
      await expect(support.emailError).toContainText("Neplatný formát e-mailu.");
    });

    await test.step("Verify the phone error message is visible with the correct text", async () => {
      await expect(support.phoneError).toBeVisible();
      await expect(support.phoneError).toContainText("Neplatný formát telefónneho čísla.");
    });

    await test.step("Verify no success toast appears — the save was blocked by validation", async () => {
      await expect(support.toast).toHaveCount(0);
    });
  });
});
