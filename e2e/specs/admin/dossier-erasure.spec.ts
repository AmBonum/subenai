import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedProfile, seedUserRole } from "../../seed";
import { AdminUserDossierPage } from "../../poms/admin/AdminUserDossierPage";

/**
 * GDPR mutation coverage for the user dossier — the Art. 15 / 16 / 17
 * actions that `dossier-flow.spec.ts` explicitly scoped OUT ("the
 * mutation paths … are NOT in scope here"). These are the legally
 * load-bearing flows: data export, rectification, anonymisation, and
 * the hard-delete grace window + cancel.
 *
 * The mock RPCs share closure state so the end-to-end loop is realistic:
 * enqueueing a hard-delete flips `pendingActive`, the dossier refetch
 * (triggered by query invalidation) then renders the pending banner, and
 * cancelling clears it — exactly the server round-trip the UI relies on.
 * Verbatim Slovak strings come from src/i18n/locales/sk/governance.json.
 */

const TARGET_ID = "prof_dsr_target";
const TARGET_EMAIL = "target@erase.test";

interface DossierStateOptions {
  /** cancel_pending_erasure return value — false models the too-late path. */
  cancelSucceeds?: boolean;
}

/**
 * Build a stateful set of dossier RPC resolvers. `export_user_data_admin`
 * reads the mutable `displayName` + `pendingActive`, so re-reads after a
 * mutation reflect the new state — mirroring the real DB.
 */
function dossierRpcs(opts: DossierStateOptions = {}) {
  const cancelSucceeds = opts.cancelSucceeds ?? true;
  let displayName: string | null = "Mallory Target";
  let pendingActive = false;

  const payload = () => ({
    subject: { user_id: TARGET_ID, email: TARGET_EMAIL },
    generated_at: "2026-06-12T10:00:00Z",
    records: {
      profile: {
        id: TARGET_ID,
        email: TARGET_EMAIL,
        display_name: displayName,
        avatar_initials: null,
        created_at: "2026-04-01T00:00:00Z",
      },
      profile_preferences: null,
      user_roles: [{ user_id: TARGET_ID, role: "user", assigned_by: null }],
      dsr_requests: [],
      dpa_requests: [],
      pending_erasure: pendingActive ? { execute_at: "2026-06-12T10:05:00Z" } : null,
    },
  });

  return {
    export_user_data_admin: () => payload(),
    erase_user_data: (body: unknown) => {
      const strategy = (body as { p_strategy?: string } | null)?.p_strategy;
      if (strategy === "anonymize") {
        displayName = null;
        return {
          strategy: "anonymize",
          executed_at: "2026-06-12T10:01:00Z",
          rows_affected: { profiles: 1, sessions: 3 },
        };
      }
      pendingActive = true;
      return {
        strategy: "hard_delete",
        enqueued_at: "2026-06-12T10:00:00Z",
        execute_at: "2026-06-12T10:05:00Z",
        grace_window_minutes: 5,
      };
    },
    rectify_user_data: (body: unknown) => {
      const next = (body as { p_new_value?: string } | null)?.p_new_value ?? "";
      const old = displayName;
      displayName = next;
      return {
        table: "profiles",
        column: "display_name",
        old_value: old,
        new_value: next,
        applied_at: "2026-06-12T10:02:00Z",
      };
    },
    cancel_pending_erasure: () => {
      if (cancelSucceeds) pendingActive = false;
      return cancelSucceeds;
    },
  };
}

async function openDossier(
  context: Parameters<typeof setupAdmin>[0],
  page: Parameters<typeof setupAdmin>[1],
  opts: DossierStateOptions = {},
) {
  await setupAdmin(context, page, {
    tables: {
      profiles: [
        seedProfile({ id: TARGET_ID, email: TARGET_EMAIL, display_name: "Mallory Target" }),
      ],
      user_roles: [seedUserRole({ user_id: TARGET_ID, role: "user" })],
      dsr_requests: [],
      dpa_requests: [],
    },
    rpcs: dossierRpcs(opts),
  });
  const dossier = new AdminUserDossierPage(page);
  await dossier.open(TARGET_ID);
  await expect(dossier.header).toBeVisible();
  return dossier;
}

test.describe("Dossier — Art. 17 anonymise (typed-confirm gated)", () => {
  test("confirm button stays disabled until the exact e-mail is typed, then fires", async ({
    context,
    page,
  }) => {
    const dossier = await openDossier(context, page);

    await test.step("Open the anonymise dialog", async () => {
      await dossier.anonymizeButton.click();
      await expect(dossier.confirmDialog).toBeVisible();
    });

    await test.step("Confirm is disabled with empty input", async () => {
      await expect(dossier.confirmButton).toBeDisabled();
    });

    await test.step("A wrong e-mail keeps it disabled (typo-guard)", async () => {
      await dossier.confirmTypedInput.fill("wrong@erase.test");
      await expect(dossier.confirmButton).toBeDisabled();
    });

    await test.step("The exact e-mail enables + firing shows the row-count toast", async () => {
      await dossier.confirmTypedInput.fill(TARGET_EMAIL);
      await expect(dossier.confirmButton).toBeEnabled();
      await dossier.confirmButton.click();
      // total = profiles(1) + sessions(3) = 4
      await expect(dossier.toast).toContainText("PII anonymizované (4 riadkov).");
    });

    await test.step("Header flips to the anonymised marker after the refetch", async () => {
      await expect(dossier.headerName).toContainText("(anonymizované)");
    });
  });

  test("surfaces the failure toast when the erase RPC errors", async ({ context, page }) => {
    await setupAdmin(context, page, {
      tables: {
        profiles: [
          seedProfile({ id: TARGET_ID, email: TARGET_EMAIL, display_name: "Mallory Target" }),
        ],
        user_roles: [seedUserRole({ user_id: TARGET_ID, role: "user" })],
        dsr_requests: [],
        dpa_requests: [],
      },
      rpcs: {
        export_user_data_admin: () => ({
          subject: { user_id: TARGET_ID, email: TARGET_EMAIL },
          generated_at: "2026-06-12T10:00:00Z",
          records: {
            profile: {
              id: TARGET_ID,
              email: TARGET_EMAIL,
              display_name: "Mallory Target",
              avatar_initials: null,
              created_at: "2026-04-01T00:00:00Z",
            },
            profile_preferences: null,
            user_roles: [{ user_id: TARGET_ID, role: "user", assigned_by: null }],
            dsr_requests: [],
            dpa_requests: [],
            pending_erasure: null,
          },
        }),
      },
      errors: {
        erase_user_data: { status: 403, code: "42501", message: "insufficient_privilege" },
      },
    });

    const dossier = new AdminUserDossierPage(page);
    await dossier.open(TARGET_ID);
    await expect(dossier.header).toBeVisible();

    await dossier.anonymizeButton.click();
    await dossier.typeConfirmAndSubmit(TARGET_EMAIL);

    await expect(dossier.toast).toContainText("Akcia zlyhala");
  });
});

test.describe("Dossier — Art. 17 hard-delete + grace window", () => {
  test("enqueue surfaces the grace toast, banner appears, cancel clears it", async ({
    context,
    page,
  }) => {
    const dossier = await openDossier(context, page);

    await test.step("No pending banner before any action", async () => {
      await expect(dossier.pendingHeading).toHaveCount(0);
    });

    await test.step("Hard-delete is typed-confirm gated", async () => {
      await dossier.hardDeleteButton.click();
      await expect(dossier.confirmDialog).toBeVisible();
      await expect(dossier.confirmButton).toBeDisabled();
      await dossier.typeConfirmAndSubmit(TARGET_EMAIL);
    });

    await test.step("The grace-window toast names the 5-minute window", async () => {
      await expect(dossier.toast).toContainText("vykoná sa o 5 min");
    });

    await test.step("The pending-erasure banner appears after the refetch", async () => {
      await expect(dossier.pendingHeading).toBeVisible();
      await expect(dossier.cancelPendingButton).toBeVisible();
    });

    await test.step("Cancelling within the window clears the banner", async () => {
      await dossier.cancelPendingButton.click();
      await expect(dossier.toast).toContainText("Vymazanie zrušené.");
      await expect(dossier.pendingHeading).toHaveCount(0);
    });
  });

  test("cancel after the window closed shows the too-late notice and keeps the banner", async ({
    context,
    page,
  }) => {
    const dossier = await openDossier(context, page, { cancelSucceeds: false });

    await dossier.hardDeleteButton.click();
    await dossier.typeConfirmAndSubmit(TARGET_EMAIL);
    await expect(dossier.pendingHeading).toBeVisible();

    await dossier.cancelPendingButton.click();
    await expect(dossier.toast).toContainText("Okno na zrušenie už uplynulo");
    // The erasure is already running — the banner must NOT disappear.
    await expect(dossier.pendingHeading).toBeVisible();
  });
});

test.describe("Dossier — Art. 16 rectification", () => {
  test("rectify confirm is gated on a real change and persists through refetch", async ({
    context,
    page,
  }) => {
    const dossier = await openDossier(context, page);

    await test.step("Open the rectify dialog from the display-name pencil", async () => {
      await dossier.rectifyTrigger.click();
      await expect(dossier.rectifyDialog).toBeVisible();
    });

    await test.step("Confirm is disabled while the value is unchanged", async () => {
      await expect(dossier.rectifyConfirm).toBeDisabled();
    });

    await test.step("Saving a new value fires the RPC + audit-log toast", async () => {
      await dossier.rectifyInput.fill("Corrected Name");
      await expect(dossier.rectifyConfirm).toBeEnabled();
      await dossier.rectifyConfirm.click();
      await expect(dossier.toast).toContainText("Meno opravené. Záznam v audit logu.");
    });

    await test.step("The corrected name is reflected in the header", async () => {
      await expect(dossier.headerName).toContainText("Corrected Name");
    });
  });
});

test.describe("Dossier — Art. 15 export", () => {
  test("export triggers a JSON download + confirmation toast", async ({ context, page }) => {
    const dossier = await openDossier(context, page);

    const downloadPromise = page.waitForEvent("download");
    await dossier.exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain(`dossier-${TARGET_ID}`);
    await expect(dossier.toast).toContainText("JSON snapshot bol stiahnutý.");
  });
});
