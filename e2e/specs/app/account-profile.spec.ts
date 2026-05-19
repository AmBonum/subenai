import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppAccountProfilePage } from "../../poms/app/AppAccountProfilePage";

test.describe("/app/account/profile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-01: Profile form renders with name, email, and Save button
  test("TC-01: profile form renders with name, email, and Save button", async ({ page }) => {
    const profile = new AppAccountProfilePage(page);

    await test.step("Open the profile page", async () => {
      await profile.open();
    });

    await test.step("Verify the profile form is visible", async () => {
      await expect(profile.form).toBeVisible();
    });

    await test.step("Verify the display-name input is visible", async () => {
      await expect(profile.nameInput).toBeVisible();
    });

    await test.step("Verify the email input is visible", async () => {
      await expect(profile.emailInput).toBeVisible();
    });

    await test.step("Verify the Save button is visible", async () => {
      await expect(profile.submit).toBeVisible();
    });
  });

  // TC-02: Editing display_name and clicking Save shows success state
  test("TC-02: editing display_name and clicking Save shows success state", async ({ page }) => {
    const profile = new AppAccountProfilePage(page);

    await test.step("Open the profile page", async () => {
      await profile.open();
    });

    await test.step("Clear the display-name input and type a new name", async () => {
      await profile.nameInput.clear();
      await profile.nameInput.fill("Jana Nováková");
    });

    await test.step("Verify the dirty badge reads 'Neuložené zmeny'", async () => {
      await expect(profile.badgeDirty).toHaveText("Neuložené zmeny");
    });

    await test.step("Click the Save button", async () => {
      await profile.submit.click();
    });

    await test.step("Verify the success status element is visible", async () => {
      await expect(profile.successToast).toBeVisible();
    });
  });

  // TC-03: "Prejsť na Bezpečnosť účtu" button links to /app/account/security
  test("TC-03: security link button is visible and points to /app/account/security", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);

    await test.step("Open the profile page", async () => {
      await profile.open();
    });

    await test.step("Verify the security link button is visible", async () => {
      await expect(profile.gotoSecurity).toBeVisible();
    });

    await test.step("Verify its href points to /app/account/security", async () => {
      await expect(profile.gotoSecurity).toHaveAttribute("href", "/app/account/security");
    });
  });
});
