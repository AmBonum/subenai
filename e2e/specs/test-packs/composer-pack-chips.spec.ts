import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { platformPacksAvailable, PACKS_SKIP_MESSAGE } from "../../fixtures/platform-packs";

/**
 * E37 — Composer pack-chip DB read path (TC-22, TC-23, TC-24, TC-25).
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-22–TC-25).
 *
 * These TCs exercise the Phase G3 DB-backed composer at /test/builder.
 * The page calls usePlatformPacks() + usePlatformPackQuestionIds() at
 * runtime — no mocks are applied; the live RPC is used. Tests assume 15
 * packs are present in the DB (Phase B' migration applied).
 *
 * TC-22: Pack-chips section is visible and shows exactly 15 chips.
 * TC-23: Toggling a chip ON adds its question IDs; toggling OFF removes them.
 * TC-24: Selecting enough chips to exceed 50 questions triggers a cap notice.
 * TC-25: ?config= URL param pre-fills the heslo-2fa chip as aria-pressed="true".
 *
 * Encoded config for TC-25:
 *   {"q":["p-sms-posta-1","p-sms-dpd-1","p-sms-tatra-1","p-sms-slsp-1",
 *         "p-sms-csob-1"],"t":70,"m":5,"l":null,"s":["heslo-2fa"]}
 *   → eyJxIjpbInAtc21zLXBvc3RhLTEiLCJwLXNtcy1kcGQtMSIsInAtc21zLXRh
 *       dHJhLTEiLCJwLXNtcy1zbHNwLTEiLCJwLXNtcy1jc29iLTEiXSwidCI6NzAs
 *       Im0iOjUsImwiOm51bGwsInMiOlsiaGVzbG8tMmZhIl19
 */

const CONFIG_HESLO_2FA =
  "eyJxIjpbInAtc21zLXBvc3RhLTEiLCJwLXNtcy1kcGQtMSIsInAtc21zLXRhdHJhLTEiLCJwLXNtcy1zbHNwLTEiLCJwLXNtcy1jc29iLTEiXSwidCI6NzAsIm0iOjUsImwiOm51bGwsInMiOlsiaGVzbG8tMmZhIl19";

// Environment guard — these TCs read live pack rows (no mock layer);
// skip loudly when the configured Supabase project has no published
// platform packs. See e2e/fixtures/platform-packs.ts.
test.beforeEach(async ({ request }) => {
  test.skip(!(await platformPacksAvailable(request)), PACKS_SKIP_MESSAGE);
});

test.describe("/test/builder — composer pack chips (TC-22, TC-23, TC-24, TC-25)", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-22: Composer shows 15 pack chips; toggling a chip adds its question IDs to the pool.
  test("TC-22: pack-chips section is visible with 15 chips; toggling heslo-2fa adds IDs", async ({
    composer,
  }) => {
    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Verify the pack-chips section is visible", async () => {
      await expect(composer.packChipsSection).toBeVisible();
    });

    await test.step("Verify exactly 15 pack chips are rendered", async () => {
      // Structural count assertion: the packChipsSection contains 15 chip
      // buttons. getByRole("button") on the section is used here because
      // there is no stable per-index testid — the count IS the contract.
      // Each chip also carries its own data-testid for individual targeting.
      const chipCount = await composer.packChipsSection.getByRole("button").count();
      expect(chipCount).toBe(15);
    });

    await test.step("Toggle the heslo-2fa chip ON", async () => {
      await composer.togglePackChip("heslo-2fa");
    });

    await test.step("Verify the selection summary shows a count greater than 0", async () => {
      const summaryText = await composer.selectionSummary.textContent();
      expect(summaryText).toBeTruthy();
      // Any non-zero count (e.g. "7 otázok", "8 otázok") is acceptable.
      expect(summaryText).not.toMatch(/^0\b/);
    });
  });

  // TC-23: Toggling a composer pack chip OFF removes its IDs.
  test("TC-23: toggling heslo-2fa OFF reduces selection count back to 0", async ({ composer }) => {
    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Toggle heslo-2fa chip ON (prerequisite: active chip)", async () => {
      await composer.togglePackChip("heslo-2fa");
      const summaryText = await composer.selectionSummary.textContent();
      expect(summaryText).toBeTruthy();
      expect(summaryText).not.toMatch(/^0\b/);
    });

    await test.step("Toggle heslo-2fa chip OFF", async () => {
      await composer.togglePackChip("heslo-2fa");
    });

    await test.step("Verify the selection summary count returns to 0", async () => {
      const summaryText = await composer.selectionSummary.textContent();
      expect(summaryText).toMatch(/^0\b/);
    });

    await test.step("Verify the run-self button is disabled or absent (no questions selected)", async () => {
      // With 0 questions selected the run button must be inert.
      const runVisible = await composer.runSelfButton.isVisible().catch(() => false);
      if (runVisible) {
        await expect(composer.runSelfButton).toBeDisabled();
      } else {
        // Button absent when no questions are selected — also acceptable.
        await expect(composer.runSelfButton).not.toBeVisible();
      }
    });
  });

  // TC-24: Selecting more than 50 questions triggers the cap notification.
  test("TC-24: activating enough pack chips to exceed 50 questions shows cap notice", async ({
    composer,
  }) => {
    await test.step("Open /test/builder", async () => {
      await composer.open();
    });

    await test.step("Toggle pack chips until the selection exceeds 50 questions", async () => {
      // Each pack has at least 7 questions; toggling 8 packs guarantees >50.
      // We toggle them sequentially and stop as soon as the cap fires.
      const slugsToTry = [
        "vseobecny",
        "seniori",
        "studenti",
        "ziaci-do-16",
        "eshop",
        "gastro-horeca",
        "autoservis",
        "it-vyvoj",
      ];
      for (const slug of slugsToTry) {
        await composer.togglePackChip(slug);
        const summaryText = await composer.selectionSummary.textContent();
        const match = summaryText?.match(/\d+/);
        if (match && parseInt(match[0], 10) >= 50) break;
      }
    });

    await test.step("Verify the stale/cap notice is visible", async () => {
      // The plan (open question at line 416) notes the cap may use
      // data-testid="composer-stale-notice" (reused from the drift notice)
      // or a separate element. The POM exposes `staleNotice` for the
      // existing testid. Check that element first.
      await expect(composer.staleNotice).toBeVisible();
    });
  });

  // TC-25: Composer URL ?config=<encoded> pre-fills pack chip state.
  test("TC-25: ?config= URL pre-fills the heslo-2fa chip as aria-pressed and count > 0", async ({
    composer,
  }) => {
    await test.step("Open /test/builder with a pre-encoded ?config= that activates heslo-2fa", async () => {
      await composer.open(`?config=${CONFIG_HESLO_2FA}`);
    });

    await test.step("Verify the heslo-2fa pack chip shows aria-pressed='true'", async () => {
      await expect(composer.packChip("heslo-2fa")).toHaveAttribute("aria-pressed", "true");
    });

    await test.step("Verify the selection summary count is greater than 0 without any click", async () => {
      const summaryText = await composer.selectionSummary.textContent();
      expect(summaryText).toBeTruthy();
      expect(summaryText).not.toMatch(/^0\b/);
    });
  });
});
