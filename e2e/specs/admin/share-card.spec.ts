import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { AdminShareCardPage } from "../../poms/admin/AdminShareCardPage";

const CMS_SHARE_CARD_TABLE = [
  {
    id: 1,
    branding: {
      og_template_url: "https://cdn.example.com/og-template.png",
      title_fallback: "Subenai – IQ test",
      description_fallback: "Zisti svoje IQ ešte dnes.",
    },
  },
];

const CMS_SHARE_CARD_EMPTY_TITLE = [
  {
    id: 1,
    branding: {
      og_template_url: "",
      title_fallback: "",
      description_fallback: "",
    },
  },
];

test.describe("/admin/share-card", () => {
  // TC-01: Page renders form with all three inputs, preview, and save button
  test("TC-01: page renders form root with all three inputs, preview, and save button", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { share_card_config: CMS_SHARE_CARD_TABLE } });
    const card = new AdminShareCardPage(page);

    await test.step("Navigate to /admin/share-card", async () => {
      await card.open();
    });

    await test.step("Verify the form root is visible", async () => {
      await expect(card.root).toBeVisible();
    });

    await test.step("Verify the OG template URL input is visible", async () => {
      await expect(card.ogTemplateInput).toBeVisible();
    });

    await test.step("Verify the title fallback input is visible", async () => {
      await expect(card.titleFallbackInput).toBeVisible();
    });

    await test.step("Verify the description fallback textarea is visible", async () => {
      await expect(card.descriptionFallbackTextarea).toBeVisible();
    });

    await test.step("Verify the preview panel is visible", async () => {
      await expect(card.preview).toBeVisible();
    });

    await test.step('Verify the save button labelled "Uložiť" is visible and enabled', async () => {
      await expect(card.saveButton).toBeVisible();
      await expect(card.saveButton).toBeEnabled();
    });
  });

  // TC-02: Edit text fields and submit → success toast fires
  test("TC-02: editing text fields and submitting the form shows the success toast", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, { tables: { share_card_config: CMS_SHARE_CARD_TABLE } });
    const card = new AdminShareCardPage(page);

    await test.step("Navigate to /admin/share-card", async () => {
      await card.open();
      await expect(card.root).toBeVisible();
    });

    await test.step('Fill the OG template URL input with "https://example.com/og.png"', async () => {
      await card.ogTemplateInput.fill("https://example.com/og.png");
    });

    await test.step('Fill the title fallback input with "Subenai – test IQ"', async () => {
      await card.titleFallbackInput.fill("Subenai – test IQ");
    });

    await test.step('Fill the description fallback textarea with "Otestuj sa teraz."', async () => {
      await card.descriptionFallbackTextarea.fill("Otestuj sa teraz.");
    });

    await test.step("Click the save button", async () => {
      await card.submit();
    });

    await test.step('Verify the success toast "Share karta uložená." appears', async () => {
      await expect(card.toast).toBeVisible({ timeout: 4000 });
      await expect(card.toast).toContainText("Share karta uložená.");
    });
  });

  // TC-03: Empty title fallback → save button disabled and error message visible
  test("TC-03: empty title fallback disables the save button and shows inline validation", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: { share_card_config: CMS_SHARE_CARD_EMPTY_TITLE },
    });
    const card = new AdminShareCardPage(page);

    await test.step("Navigate to /admin/share-card", async () => {
      await card.open();
      await expect(card.root).toBeVisible();
    });

    await test.step("Verify the save button is disabled", async () => {
      await expect(card.saveButton).toBeDisabled();
    });

    await test.step('Verify the inline message "Predvolený názov je povinný." is visible', async () => {
      await expect(card.titleError).toBeVisible();
      await expect(card.titleError).toHaveText("Predvolený názov je povinný.");
    });
  });
});
