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

  // TC-04: Pristine form shows 'Aktuálne uložené' badge and disabled Save/Reset
  test("TC-04: pristine form shows the saved badge and disabled Save/Reset controls", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);

    await test.step("Open the profile page", async () => {
      await profile.open();
    });

    await test.step("Verify the saved badge reads 'Aktuálne uložené'", async () => {
      await expect(profile.badgeSaved).toBeVisible();
      await expect(profile.badgeSaved).toHaveText("Aktuálne uložené");
    });

    await test.step("Verify the dirty badge is not rendered yet", async () => {
      await expect(profile.badgeDirty).toHaveCount(0);
    });

    await test.step("Verify the Save and Reset buttons are disabled while pristine", async () => {
      await expect(profile.submit).toBeDisabled();
      await expect(profile.reset).toBeDisabled();
    });
  });

  // TC-05: Reset button reverts dirty edits and restores the saved badge
  test("TC-05: clicking Reset reverts the display-name edit and restores the saved badge", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);

    await test.step("Open the profile page and capture the persisted display name", async () => {
      await profile.open();
      // Wait for the async profile query to hydrate the form before
      // capturing the baseline value; otherwise we read "" pre-hydration
      // and the Reset assertion compares against the empty pre-load state.
      await expect(profile.nameInput).not.toHaveValue("");
    });
    const original = await profile.nameInput.inputValue();

    await test.step("Edit the display-name input to a different value", async () => {
      await profile.nameInput.fill("Iné meno");
    });

    await test.step("Verify the dirty badge appears and Reset enables", async () => {
      await expect(profile.badgeDirty).toBeVisible();
      await expect(profile.reset).toBeEnabled();
    });

    await test.step("Click Reset", async () => {
      await profile.reset.click();
    });

    await test.step("Verify the input has reverted to the original value", async () => {
      await expect(profile.nameInput).toHaveValue(original);
    });

    await test.step("Verify the saved badge is shown again", async () => {
      await expect(profile.badgeSaved).toBeVisible();
      await expect(profile.badgeSaved).toHaveText("Aktuálne uložené");
    });
  });

  // TC-06: Submitting a too-short display_name surfaces the inline name error
  test("TC-06: submitting a 1-character display name surfaces the inline name error", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);

    await test.step("Open the profile page and wait for the form to hydrate", async () => {
      await profile.open();
      // Wait for the async profile query to populate the form, otherwise
      // our fill races the late setDisplayName(me.display_name) sync.
      await expect(profile.nameInput).not.toHaveValue("");
    });

    await test.step("Replace the display-name value with a single character", async () => {
      await profile.nameInput.fill("A");
    });

    await test.step("Click Save", async () => {
      await profile.submit.click();
    });

    await test.step("Verify the inline name error is rendered verbatim", async () => {
      await expect(profile.nameError).toBeVisible();
      await expect(profile.nameError).toHaveText("Meno musí mať aspoň 2 znaky.");
    });

    await test.step("Verify the dirty badge stays visible (save was blocked)", async () => {
      await expect(profile.badgeDirty).toBeVisible();
    });
  });
});

test.describe("/app/account/profile @mobile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-07: form inputs render full-width on mobile without horizontal overflow
  test("TC-07: form inputs render full-width on mobile without horizontal overflow", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);

    await test.step("Open the profile page at Pixel 7 viewport", async () => {
      await profile.open();
    });

    await test.step("Verify the form and primary inputs are visible", async () => {
      await expect(profile.form).toBeVisible();
      await expect(profile.nameInput).toBeVisible();
      await expect(profile.emailInput).toBeVisible();
    });

    await test.step("Verify the display-name input claims most of the viewport width", async () => {
      const bbox = await profile.nameInput.boundingBox();
      expect(bbox?.width).toBeGreaterThan(300);
    });

    await test.step("Verify the email input claims most of the viewport width", async () => {
      const bbox = await profile.emailInput.boundingBox();
      expect(bbox?.width).toBeGreaterThan(300);
    });

    await test.step("Verify the document body does not horizontally overflow the viewport", async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
