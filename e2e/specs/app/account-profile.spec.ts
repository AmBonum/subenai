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

test.describe("/app/account/profile — GDPR data export (Art. 15 + 20)", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // TC-08: The export card is rendered with the button visible and
  // enabled (pristine state) — guards against the card disappearing
  // from the profile page in a future refactor.
  test("TC-08: data export card renders with the button enabled", async ({ page }) => {
    const profile = new AppAccountProfilePage(page);
    await profile.open();
    await expect(profile.dataExportCard).toBeVisible();
    await expect(profile.dataExportCard).toContainText(
      "Stiahnutie tvojich údajov (GDPR čl. 15 / čl. 20)",
    );
    await expect(profile.dataExportButton).toBeVisible();
    await expect(profile.dataExportButton).toBeEnabled();
    await expect(profile.dataExportButton).toContainText("Stiahnuť moje údaje (JSON)");
  });

  // TC-09: Happy path — the button POSTs to /api/account/export-data
  // with the user's bearer token and the JSON response triggers a
  // browser download. We assert the file content matches the snapshot
  // we mock the server to return — that's the "user downloads the
  // CORRECT data" contract from the senior audit (E36 hot-fix
  // 2026-05-21). Without this assertion the test passes for ANY 200
  // response, which would let a bug shipping someone else's snapshot
  // slip through.
  test("TC-09: clicking download fetches the snapshot and saves the exact JSON payload", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);

    const SNAPSHOT = {
      generated_at: "2026-05-21T10:00:00.000Z",
      subject: {
        user_id: "00000000-0000-0000-0000-000000000002",
        email: "educator@e2e.test",
      },
      rights: {
        access: "GDPR Art. 15",
        portability: "GDPR Art. 20",
        erasure: "GDPR Art. 17 — see /app/account/profile for delete",
      },
      records: {
        profile: { id: "educator", email: "educator@e2e.test" },
        dsr_requests: [],
        attempts_note: "Anonymous quiz attempts are not linked …",
      },
    } as const;

    // Intercept the API call BEFORE opening the page so the route
    // is registered when handleExport fires. Capture the Bearer
    // header to assert it carries the user's session token (not the
    // anon key or nothing).
    let capturedAuth: string | null = null;
    await page.route("**/api/account/export-data", async (route) => {
      capturedAuth = route.request().headers()["authorization"] ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        headers: {
          "content-disposition": 'attachment; filename="subenai-export-2026-05-21.json"',
        },
        body: JSON.stringify(SNAPSHOT),
      });
    });

    await profile.open();

    // Capture the download triggered by the dynamically-created <a>.
    const downloadPromise = page.waitForEvent("download");
    await profile.dataExportButton.click();
    const download = await downloadPromise;

    // Filename uses the client-side today() date, NOT the server's
    // Content-Disposition — that's the component contract. The Blob
    // content is what the user actually receives.
    expect(download.suggestedFilename()).toMatch(/^subenai-export-\d{4}-\d{2}-\d{2}\.json$/);

    // Read the downloaded blob and assert the JSON parses + matches
    // what we mocked the server to send. This is the senior-grade
    // assertion: same bytes leaving the server, same bytes saved
    // locally — no silent drop / re-serialisation bug.
    const fs = await import("node:fs/promises");
    const path = await download.path();
    const text = path ? await fs.readFile(path, "utf8") : "";
    expect(text.length, "download body must not be empty").toBeGreaterThan(0);
    const parsed = JSON.parse(text);
    expect(parsed).toEqual(SNAPSHOT);

    // The request must have carried a Bearer token — proves the
    // export was authenticated and the user can't accidentally pull
    // an anonymous response.
    expect(capturedAuth ?? "", "Authorization header must be sent").toMatch(/^Bearer\s+\S+$/);
  });

  // TC-10: Authentication failure path — a 401 from the API surfaces
  // the "session expired" toast and does NOT trigger any download.
  test("TC-10: a 401 from the export endpoint surfaces the unauthorized toast", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);
    await page.route("**/api/account/export-data", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "missing_authorization" }),
      });
    });
    await profile.open();
    await profile.dataExportButton.click();
    await expect(
      page.getByText("Tvoja relácia vypršala — prihlás sa znova a skús to ešte raz."),
    ).toBeVisible();
  });

  // TC-11: Server-side failure path — a 500 from the API surfaces the
  // generic error toast. This is the exact symptom the user reported
  // on production (2026-05-21) when the `export_my_data()` migration
  // hadn't been applied to the prod Supabase yet — the RPC raised an
  // "undefined function" error, the CF function returned 500, and the
  // UI showed THIS toast.
  test("TC-11: a 500 from the export endpoint surfaces the generic error toast", async ({
    page,
  }) => {
    const profile = new AppAccountProfilePage(page);
    await page.route("**/api/account/export-data", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "could not find function public.export_my_data" }),
      });
    });
    await profile.open();
    await profile.dataExportButton.click();
    await expect(
      page.getByText(
        "Export sa nepodaril. Skús to o chvíľu znova, alebo nám napíš na subenai.podpora@gmail.com.",
      ),
    ).toBeVisible();
  });

  // TC-12: The button is disabled while a request is in flight.
  // Without this, double-clicks fire duplicate fetches.
  test("TC-12: button disables while the export is in flight", async ({ page }) => {
    const profile = new AppAccountProfilePage(page);
    let release: (() => void) | null = null;
    const block = new Promise<void>((r) => {
      release = r;
    });
    await page.route("**/api/account/export-data", async (route) => {
      await block;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ records: {} }),
      });
    });

    await profile.open();
    await profile.dataExportButton.click();
    // While the fulfill is gated, the button should show the
    // "Pripravujem export…" label and be disabled.
    await expect(profile.dataExportButton).toBeDisabled();
    await expect(profile.dataExportButton).toContainText("Pripravujem export…");

    // Unblock the request — Playwright still consumes the download
    // even if we don't await it, so we don't need to grab it.
    release?.();
    await expect(profile.dataExportButton).toBeEnabled();
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
