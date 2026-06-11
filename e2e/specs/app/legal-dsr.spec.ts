import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedProfile } from "../../seed";
import { AppLegalDsrPage } from "../../poms/app/AppLegalDsrPage";

const DSR_OPEN_ROW = {
  id: "dsr_seeded_001",
  requester_email: "seeded.subject@example.sk",
  type: "erase",
  status: "open",
  note: "Žiadosť o výmaz – seed.",
  created_at: "2026-05-15T08:00:00.000Z",
  sla_due_at: "2026-06-14T08:00:00.000Z",
  resolved_at: null,
};

const DSR_COMPLETED_ROW = {
  id: "dsr_seeded_002",
  requester_email: "seeded.completed@example.sk",
  type: "access",
  status: "completed",
  note: null,
  created_at: "2026-05-10T08:00:00.000Z",
  sla_due_at: "2026-06-09T08:00:00.000Z",
  resolved_at: "2026-05-12T08:00:00.000Z",
};

test.describe("/app/legal/dsr — GDPR data subject request page", () => {
  // TC-01: Page renders with title, subtitle, form card, submit button, and empty history
  test("TC-01: page renders with title, subtitle, form card, and empty history", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { dsr_requests: [] } });
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

  // TC-02: Submitting with the prefilled session email shows the success
  // banner. The requester email is locked to the signed-in user (RLS
  // requires dsr_requests.requester_email = auth.email()), so the spec
  // never types into the field — it asserts the prefill instead.
  test("TC-02: submitting with the prefilled session email shows success banner and clears the note", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { dsr_requests: [] } });
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Verify the email field is prefilled with the session profile email", async () => {
      await expect(dsr.emailInput).toHaveValue(EDUCATOR_SESSION.user.email);
    });

    await test.step("Fill the note textarea", async () => {
      await dsr.noteTextarea.fill("Chcem export svojich údajov.");
    });

    await test.step("Click the 'Podať žiadosť' submit button", async () => {
      await dsr.submitButton.click();
    });

    await test.step("Verify the success banner appears with the confirmation message", async () => {
      await expect(dsr.successBanner).toBeVisible();
      await expect(dsr.successBanner).toHaveText("Žiadosť bola podaná — odpovieme do 30 dní.");
    });

    await test.step("Verify the note is cleared and the email keeps the session value", async () => {
      await expect(dsr.noteTextarea).toHaveValue("");
      await expect(dsr.emailInput).toHaveValue(EDUCATOR_SESSION.user.email);
    });
  });

  // TC-03: Profile without a usable email → validation error, no insert.
  // (The field is read-only, so the only way to reach the invalid-email
  // branch is a profile whose email is missing/empty.)
  test("TC-03: profile without an email shows validation error and no insert occurs", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: {
        dsr_requests: [],
        profiles: [
          seedProfile({
            id: EDUCATOR_SESSION.user.id,
            email: "",
            display_name: "educator",
          }),
        ],
      },
    });
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Verify the email field is empty (no profile email to prefill)", async () => {
      await expect(dsr.emailInput).toHaveValue("");
    });

    await test.step("Click the 'Podať žiadosť' submit button", async () => {
      await dsr.submitButton.click();
    });

    await test.step("Verify the error banner appears with the invalid-email message", async () => {
      await expect(dsr.errorBanner).toBeVisible();
      await expect(dsr.errorBanner).toHaveText("Neplatný e-mail.");
    });

    await test.step("Verify no success banner and no inserted history row", async () => {
      await expect(dsr.successBanner).toHaveCount(0);
      await expect(dsr.historyEmpty).toHaveText("Zatiaľ nie sú žiadne žiadosti.");
    });
  });

  // TC-04: The requester email field is read-only — prefilled from the
  // session and not editable by the user.
  test("TC-04: requester email field is read-only and prefilled from the session", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { dsr_requests: [] } });
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Verify the email field carries the session email", async () => {
      await expect(dsr.emailInput).toHaveValue(EDUCATOR_SESSION.user.email);
    });

    await test.step("Verify the field is disabled and read-only", async () => {
      await expect(dsr.emailInput).toBeDisabled();
      await expect(dsr.emailInput).toHaveAttribute("readonly", "");
    });
  });

  // TC-05: History card renders seeded rows with email, type label, and status badge
  test("TC-05: history card renders seeded rows with email, type label, and status badge", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { dsr_requests: [DSR_OPEN_ROW, DSR_COMPLETED_ROW] },
    });
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Verify the empty-history message is gone", async () => {
      await expect(dsr.historyEmpty).toHaveCount(0);
    });

    await test.step("Verify the seeded 'erase / open' row renders with its email, type label and note", async () => {
      const row = dsr.historyRow(DSR_OPEN_ROW.id);
      await expect(row).toBeVisible();
      await expect(row).toContainText("seeded.subject@example.sk");
      // i18n: dsr_form.type.erase = "Výmaz (čl. 17 — právo na zabudnutie)"
      await expect(row).toContainText("Výmaz");
      await expect(row).toContainText("Žiadosť o výmaz – seed.");
      // status.open → "Otvorené"
      await expect(row).toContainText("Otvorené");
    });

    await test.step("Verify the seeded 'access / completed' row renders with its email and status", async () => {
      const row = dsr.historyRow(DSR_COMPLETED_ROW.id);
      await expect(row).toBeVisible();
      await expect(row).toContainText("seeded.completed@example.sk");
      // i18n: dsr_form.type.access = "Prístup k údajom (čl. 15)"
      await expect(row).toContainText("Prístup");
      // status.completed → "Uzavreté"
      await expect(row).toContainText("Uzavreté");
    });
  });

  // TC-06: AccountTabs nav exposes DSR as the active tab on /app/legal/dsr
  test("TC-06: AccountTabs nav exposes DSR as the active tab on /app/legal/dsr", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, { tables: { dsr_requests: [] } });
    const dsr = new AppLegalDsrPage(page);

    await test.step("Navigate to /app/legal/dsr", async () => {
      await dsr.open();
    });

    await test.step("Verify the DSR account tab is visible and marked aria-current=page", async () => {
      await expect(dsr.accountTabs).toBeVisible();
      await expect(dsr.accountTabDsr).toBeVisible();
      await expect(dsr.accountTabDsr).toHaveAttribute("aria-current", "page");
    });

    await test.step("Verify the profile + security sibling tabs are visible but not active", async () => {
      await expect(dsr.accountTabProfile).toBeVisible();
      await expect(dsr.accountTabProfile).not.toHaveAttribute("aria-current", "page");
      await expect(dsr.accountTabSecurity).toBeVisible();
      await expect(dsr.accountTabSecurity).not.toHaveAttribute("aria-current", "page");
    });
  });
});

test.describe("/app/legal/dsr — mobile responsive @mobile", () => {
  test("form card stacks vertically and renders without horizontal overflow on Pixel 7", async ({
    context,
    page,
  }) => {
    await setupEducator(context, page, {
      tables: { dsr_requests: [DSR_OPEN_ROW] },
    });
    const dsr = new AppLegalDsrPage(page);
    await dsr.open();

    await expect(dsr.root).toBeVisible();
    await expect(dsr.formCard).toBeVisible();
    await expect(dsr.historyCard).toBeVisible();

    // Email input must claim a comfortable share of the 412px viewport,
    // not get squeezed into a half-row by a flex-row stack.
    const emailBox = await dsr.emailInput.boundingBox();
    expect(emailBox?.width).toBeGreaterThan(250);

    // Submit button is a primary CTA — must remain a tappable target.
    const submitBox = await dsr.submitButton.boundingBox();
    expect(submitBox?.height).toBeGreaterThanOrEqual(32);

    // Seeded history row must sit fully inside the viewport — no
    // horizontal overflow even when the requester email is long.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(dsr.historyRow(DSR_OPEN_ROW.id)).toBeVisible();
  });
});
