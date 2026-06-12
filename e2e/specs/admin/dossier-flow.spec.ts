import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import { seedProfile, seedUserRole } from "../../seed";
import { AdminUsersPage } from "../../poms/admin/AdminUsersPage";
import { AdminDsrPage } from "../../poms/admin/AdminGovernanceQueuesPage";
import { AdminUserDossierPage } from "../../poms/admin/AdminUserDossierPage";

/**
 * E46.7 closeout coverage — locks the dossier deep-link flow shipped in
 * 1.14.2 (E46.2 + E46.3 MVP + E46.4) end-to-end.
 *
 * Three surfaces:
 *   1. /admin/users — *Posledná GDPR udalosť* column + *Iba s otvorenou DSR*
 *      filter (E46.2)
 *   2. /admin/dsr — *Otvoriť GDPR dossier* per-row icon, enabled vs
 *      disabled depending on whether `requester_email` matches a profile
 *      (E46.4)
 *   3. /admin/users/<id> — dossier route renders header + action toolbar
 *      + identity & governance sections (E46.3 MVP)
 *
 * The mutation paths (anonymise / hard-delete / cancel pending) are NOT
 * in scope here — they require additional RPC mocks and live behind the
 * typed-confirm gate. Scope for a follow-up phase if/when E46.5 lands.
 */

const ALICE_ID = "prof_e46_alice";
const BOB_ID = "prof_e46_bob";
const ALICE_EMAIL = "alice@e46.test";
const BOB_EMAIL = "bob@e46.test";

const aliceDsrOpen = {
  id: "dsr_e46_alice_open",
  requester_email: ALICE_EMAIL,
  type: "access",
  status: "open",
  note: null,
  created_at: "2026-05-20T12:00:00Z",
  sla_due_at: "2026-06-19T12:00:00Z",
  resolved_at: null,
};

const orphanDsr = {
  id: "dsr_e46_orphan",
  // E-mail intentionally has no matching profile so the dossier link
  // renders in the disabled state.
  requester_email: "stranger@nowhere.test",
  type: "erase",
  status: "open",
  note: null,
  created_at: "2026-05-19T09:00:00Z",
  sla_due_at: "2026-06-18T09:00:00Z",
  resolved_at: null,
};

test.describe("E46.2 — last-GDPR-event column on /admin/users", () => {
  test("renders an active DSR event cell + open-DSR amber dot for the matching user", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: {
        profiles: [
          seedProfile({ id: ALICE_ID, email: ALICE_EMAIL, display_name: "Alice" }),
          seedProfile({ id: BOB_ID, email: BOB_EMAIL, display_name: "Bob" }),
        ],
        user_roles: [seedUserRole({ user_id: ALICE_ID, role: "user" })],
        dsr_requests: [aliceDsrOpen],
        dpa_requests: [],
      },
    });

    const users = new AdminUsersPage(page);
    await users.open();

    await test.step("Both users render in the table", async () => {
      await expect(users.row(ALICE_ID)).toBeVisible();
      await expect(users.row(BOB_ID)).toBeVisible();
    });

    await test.step("Alice's GDPR cell shows the DSR badge + open-DSR dot", async () => {
      const event = users.gdprEvent(ALICE_ID);
      await expect(event).toBeVisible();
      await expect(event).toHaveAttribute("data-event-kind", "dsr");
      await expect(users.gdprOpenDot(ALICE_ID)).toBeVisible();
    });

    await test.step("Bob has no DSR/DPA — his cell shows the em-dash placeholder", async () => {
      await expect(users.gdprCell(BOB_ID)).toContainText("—");
      await expect(users.gdprOpenDot(BOB_ID)).toHaveCount(0);
    });
  });

  test("'Iba s otvorenou DSR' filter hides users without an open DSR", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: {
        profiles: [
          seedProfile({ id: ALICE_ID, email: ALICE_EMAIL, display_name: "Alice" }),
          seedProfile({ id: BOB_ID, email: BOB_EMAIL, display_name: "Bob" }),
        ],
        user_roles: [],
        dsr_requests: [aliceDsrOpen],
        dpa_requests: [],
      },
    });

    const users = new AdminUsersPage(page);
    await users.open();

    await test.step("Wait for the GDPR query to settle (Alice has the open dot)", async () => {
      await expect(users.gdprOpenDot(ALICE_ID)).toBeVisible();
    });

    await test.step("Apply the 'Iba s otvorenou DSR' filter", async () => {
      await users.selectGdprFilter("Iba s otvorenou DSR");
    });

    await test.step("Alice stays, Bob is hidden", async () => {
      await expect(users.row(ALICE_ID)).toBeVisible();
      await expect(users.row(BOB_ID)).toHaveCount(0);
    });
  });
});

test.describe("E46.4 — DSR queue ↔ dossier deep link", () => {
  test("active link when requester_email matches a profile.email", async ({ context, page }) => {
    await setupAdmin(context, page, {
      tables: {
        profiles: [seedProfile({ id: ALICE_ID, email: ALICE_EMAIL, display_name: "Alice" })],
        user_roles: [],
        dsr_requests: [aliceDsrOpen],
        dpa_requests: [],
      },
    });

    const dsr = new AdminDsrPage(page);
    await dsr.open();

    await test.step("The DSR row + active dossier link both render", async () => {
      await expect(dsr.rowById(aliceDsrOpen.id)).toBeVisible();
      const link = dsr.dossierLink(aliceDsrOpen.id);
      await expect(link).toBeVisible();
      // `<Button asChild>` propagates the data-testid onto the <a> via
      // Radix Slot, so the active state resolves to an anchor with
      // the path-substituted href.
      await expect(link).toHaveAttribute("href", `/admin/users/${ALICE_ID}`);
    });
  });

  test("disabled icon when requester_email has no matching profile", async ({ context, page }) => {
    await setupAdmin(context, page, {
      tables: {
        // No profile matching `stranger@nowhere.test`.
        profiles: [seedProfile({ id: ALICE_ID, email: ALICE_EMAIL, display_name: "Alice" })],
        user_roles: [],
        dsr_requests: [orphanDsr],
        dpa_requests: [],
      },
    });

    const dsr = new AdminDsrPage(page);
    await dsr.open();

    await test.step("The orphan DSR row + disabled dossier button both render", async () => {
      await expect(dsr.rowById(orphanDsr.id)).toBeVisible();
      const link = dsr.dossierLink(orphanDsr.id);
      // The disabled branch renders a <button>, NOT an anchor —
      // the no-link state is explicit + accessible.
      await expect(link).toBeDisabled();
    });
  });
});

test.describe("E46.3 — dossier route smoke", () => {
  test("renders header + identity + governance sections + action toolbar", async ({
    context,
    page,
  }) => {
    const alice = seedProfile({ id: ALICE_ID, email: ALICE_EMAIL, display_name: "Alice" });
    await setupAdmin(context, page, {
      tables: {
        profiles: [alice],
        user_roles: [seedUserRole({ user_id: ALICE_ID, role: "user" })],
        dsr_requests: [aliceDsrOpen],
        dpa_requests: [],
      },
      // The dossier route calls export_user_data_admin RPC; mock the
      // shape the hook expects (subject + records + generated_at).
      // `records.profile` is a single object and `pending_erasure` rides
      // inside `records` — mirrors AdminDossierResponse in
      // src/lib/admin/queries.ts.
      rpcs: {
        export_user_data_admin: () => ({
          subject: { user_id: ALICE_ID, email: ALICE_EMAIL },
          generated_at: "2026-05-21T10:00:00Z",
          records: {
            profile: {
              id: ALICE_ID,
              email: ALICE_EMAIL,
              display_name: "Alice",
              avatar_initials: null,
              created_at: "2026-04-01T00:00:00Z",
            },
            profile_preferences: null,
            user_roles: [{ user_id: ALICE_ID, role: "user", assigned_by: null }],
            dsr_requests: [aliceDsrOpen],
            dpa_requests: [],
            pending_erasure: null,
          },
        }),
      },
    });

    const dossier = new AdminUserDossierPage(page);
    await dossier.open(ALICE_ID);

    await test.step("Root + header surfaces are visible", async () => {
      await expect(dossier.root).toBeVisible();
      await expect(dossier.header).toBeVisible();
      await expect(dossier.headerName).toContainText("Alice");
      await expect(dossier.headerEmail).toContainText(ALICE_EMAIL);
    });

    await test.step("Action toolbar exposes Art. 15 / 17 buttons", async () => {
      await expect(dossier.actionToolbar).toBeVisible();
      await expect(dossier.exportButton).toBeVisible();
      await expect(dossier.anonymizeButton).toBeVisible();
      await expect(dossier.hardDeleteButton).toBeVisible();
    });

    await test.step("Identity + governance sections render", async () => {
      await expect(dossier.identitySection).toBeVisible();
      await expect(dossier.governanceSection).toBeVisible();
    });

    await test.step("No pending-erasure banner when nothing is queued", async () => {
      await expect(dossier.pendingBanner).toHaveCount(0);
    });
  });
});
