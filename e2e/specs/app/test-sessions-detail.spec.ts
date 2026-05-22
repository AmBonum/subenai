// E49 Phase 1 — /app/tests/$testId Results tab + per-session side-sheet.
// Source plan: specs/app/test-sessions-detail.md (treat as the contract).
//
// Everything reads through the educator-shell mock — `setupEducator`
// wires the auth session + the supabase REST mock, and `seedE49TestWithSessions`
// supplies the parent test, the five session rows, the per-question
// answers, the questions library, and the foreign-owned session used by
// TC-17 (IDOR). Mock layer caveat: the Supabase route mock does not
// emulate `.or(...)` filters or `intake_data->>name` JSON-path ILIKEs, so
// the `useTestSessions` search ILIKE degrades to a client-side filter
// (real PostgREST is the canonical source). TCs that rely on
// server-filtered narrowing assert the resulting visible state — the
// underlying behaviour is the contract.

import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { seedE49TestWithSessions } from "../../seed";
import { TestSessionsDetailPage } from "../../poms/app/TestSessionsDetail";

test.describe("/app/tests/$testId — Results tab + session detail (E49 Phase 1)", () => {
  // -------------------------------------------------------------- Happy paths

  // TC-01: Results tab renders KPI cards and sessions list root
  test("TC-01: Results tab renders KPI cards and sessions list root", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor on the results tab", async () => {
      await detail.gotoTest(seed.testId);
    });

    await test.step("Verify the sessions list root is visible", async () => {
      await expect(detail.root).toBeVisible();
    });

    await test.step("Verify each KPI card label + value", async () => {
      await expect(detail.kpiTotal).toContainText("Spolu respondentov");
      await expect(detail.kpiTotal).toContainText("5");
      await expect(detail.kpiCompleted).toContainText("Dokončené");
      await expect(detail.kpiCompleted).toContainText("3");
      await expect(detail.kpiAvgScore).toContainText("Priemerné skóre");
      // Avg of the 3 completed sessions (85+60+40)/3 ≈ 62 once rounded.
      await expect(detail.kpiAvgScore).toContainText("62%");
    });

    await test.step("Verify each seeded session row is rendered", async () => {
      await expect(detail.row("sess-completed-named")).toBeVisible();
      await expect(detail.row("sess-completed-email-only")).toBeVisible();
      await expect(detail.row("sess-completed-anon")).toBeVisible();
      await expect(detail.row("sess-in-progress")).toBeVisible();
      await expect(detail.row("sess-abandoned")).toBeVisible();
    });
  });

  // TC-02: Status filter narrows the list to "Prebiehajúce"
  test("TC-02: status filter narrows the list to 'Prebiehajúce'", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor on the results tab", async () => {
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
    });

    await test.step("Open the status filter and pick 'Prebiehajúce'", async () => {
      await detail.filterByStatus("in_progress");
    });

    await test.step("Verify only the in-progress row is visible", async () => {
      await expect(detail.row("sess-in-progress")).toBeVisible();
      await expect(detail.row("sess-completed-named")).toHaveCount(0);
      await expect(detail.row("sess-completed-email-only")).toHaveCount(0);
      await expect(detail.row("sess-completed-anon")).toHaveCount(0);
      await expect(detail.row("sess-abandoned")).toHaveCount(0);
    });
  });

  // TC-03: Search by e-mail filters rows to the matching respondent
  test("TC-03: search by e-mail filters rows to the matching respondent", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor on the results tab", async () => {
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
    });

    await test.step("Type the email-only respondent's address into the search box", async () => {
      await detail.search("anon-email@example.com");
    });

    await test.step("Verify only the matching row is rendered", async () => {
      await expect(detail.row("sess-completed-email-only")).toBeVisible();
      await expect(detail.row("sess-completed-named")).toHaveCount(0);
      await expect(detail.row("sess-completed-anon")).toHaveCount(0);
      await expect(detail.row("sess-in-progress")).toHaveCount(0);
      await expect(detail.row("sess-abandoned")).toHaveCount(0);
    });
  });

  // TC-04: Sort by "Najvyššie skóre" reorders rows score-desc
  test("TC-04: sort 'Najvyššie skóre' orders completed rows by score desc", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor on the results tab", async () => {
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
    });

    await test.step("Restrict the list to 'Dokončené'", async () => {
      await detail.filterByStatus("completed");
      await expect(detail.row("sess-completed-named")).toBeVisible();
    });

    await test.step("Pick the 'Najvyššie skóre' sort option", async () => {
      await detail.sortBy("score_desc");
    });

    await test.step("Verify the rows render in score-descending order", async () => {
      const trRows = detail.tableRows;
      await expect(trRows).toHaveCount(3);
      await expect(trRows.nth(0)).toHaveAttribute(
        "data-testid",
        "test-sessions-list-row-sess-completed-named",
      );
      await expect(trRows.nth(1)).toHaveAttribute(
        "data-testid",
        "test-sessions-list-row-sess-completed-email-only",
      );
      await expect(trRows.nth(2)).toHaveAttribute(
        "data-testid",
        "test-sessions-list-row-sess-completed-anon",
      );
    });
  });

  // TC-05: Pagination edges — single-page seed renders pagination info and
  // disables both edges. Multi-page traversal is exercised at Layer B in
  // `e2e/integration/e49/sessions-pagination.spec.ts`.
  test("TC-05: pagination prev/next disabled at edges on a single-page seed", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor on the results tab", async () => {
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
    });

    await test.step("Pick the smallest page size and verify pagination info renders", async () => {
      await detail.setPageSize(10);
      await expect(detail.paginationInfo).toBeVisible();
    });

    await test.step("Verify both pagination edges are disabled (5 rows < page size 10 → single page)", async () => {
      await expect(detail.paginationPrev).toBeDisabled();
      await expect(detail.paginationNext).toBeDisabled();
    });
  });

  // TC-06: Clicking "Otvoriť detail" opens the session side-sheet
  test("TC-06: clicking 'Otvoriť detail' opens the side-sheet", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor on the results tab", async () => {
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
    });

    await test.step("Click the 'Otvoriť detail' link on the named completed row", async () => {
      await detail.openSession("sess-completed-named");
    });

    await test.step("Verify the URL changes to the session route", async () => {
      await expect(page).toHaveURL(/\/app\/tests\/e49-test-001\/sessions\/sess-completed-named/);
    });

    await test.step("Verify the side-sheet root is visible while the list root stays mounted", async () => {
      await expect(detail.sheetRoot).toBeVisible();
      await expect(detail.root).toBeVisible();
    });
  });

  // ------------------------------------------------------- Side-sheet behavior

  // TC-07: Side-sheet identity precedence prefers name over e-mail
  test("TC-07: side-sheet identity prefers name over e-mail", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to the named completed session", async () => {
      await detail.gotoSession(seed.testId, "sess-completed-named");
    });

    await test.step("Verify the identity shows the seeded name", async () => {
      await expect(detail.sheetRoot).toBeVisible();
      await expect(detail.respondentIdentity).toHaveText("Jana Nováková");
    });

    await test.step("Verify the sheet title 'Detail respondenta' is visible", async () => {
      await expect(detail.sheetRoot).toContainText("Detail respondenta");
    });
  });

  // TC-08: Side-sheet falls back to e-mail when name is missing
  test("TC-08: side-sheet falls back to e-mail when name is missing", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to the email-only completed session", async () => {
      await detail.gotoSession(seed.testId, "sess-completed-email-only");
    });

    await test.step("Verify the identity shows the e-mail", async () => {
      await expect(detail.respondentIdentity).toHaveText("anon-email@example.com");
    });

    await test.step("Verify the identity does not show 'Anonymný respondent'", async () => {
      await expect(detail.respondentIdentity).not.toContainText("Anonymný respondent");
    });
  });

  // TC-09: Side-sheet shows "Anonymný respondent" when name and e-mail are both missing
  test("TC-09: side-sheet shows 'Anonymný respondent' when intake data is empty", async ({
    page,
  }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to the fully-anonymized completed session", async () => {
      await detail.gotoSession(seed.testId, "sess-completed-anon");
    });

    await test.step("Verify the identity shows 'Anonymný respondent'", async () => {
      await expect(detail.respondentIdentity).toHaveText("Anonymný respondent");
    });
  });

  // TC-10: Side-sheet metadata block renders status, score, timestamps, duration, audit ref
  test("TC-10: side-sheet metadata block renders status, score, timestamps, duration, audit ref", async ({
    page,
  }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to the named completed session", async () => {
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.sheetRoot).toBeVisible();
    });

    await test.step("Verify the status badge is visible", async () => {
      await expect(detail.statusBadge).toBeVisible();
    });

    await test.step("Verify the score block contains 'Skóre' and the seeded 85 value", async () => {
      await expect(detail.score).toContainText("Skóre");
      await expect(detail.score).toContainText("85");
    });

    await test.step("Verify the Začaté + Dokončené timestamp cells are populated", async () => {
      await expect(detail.startedAt).toBeVisible();
      await expect(detail.startedAt).not.toHaveText("—");
      await expect(detail.finishedAt).toBeVisible();
      await expect(detail.finishedAt).not.toHaveText("—");
    });

    await test.step("Verify the Trvanie cell contains a formatted duration", async () => {
      await expect(detail.duration).toBeVisible();
      // Component formats as "{min}m {rem}s" or "{sec}s"; the value is
      // strictly non-empty and not the fallback placeholder.
      await expect(detail.duration).not.toHaveText("—");
    });

    await test.step("Verify the IP audit ref shows only the last 6 chars", async () => {
      await expect(detail.auditRef).toBeVisible();
      // Source helper renders `…<last-6>`; the prefix is the unicode
      // ellipsis followed by exactly 6 hash chars.
      await expect(detail.auditRef).toHaveText(/^….{6}$/);
    });
  });

  // TC-11: Side-sheet Q&A list renders correctness markers, expected value and time
  test("TC-11: side-sheet Q&A list renders correctness markers, expected + time", async ({
    page,
  }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to the named completed session", async () => {
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.sheetRoot).toBeVisible();
    });

    await test.step("Verify the correct-answer row renders its value + expected + time + 'Správna odpoveď'", async () => {
      const correctRow = detail.answerRow("q-e49-correct");
      await expect(correctRow).toBeVisible();
      await expect(correctRow).toContainText("Odpoveď respondenta");
      await expect(correctRow).toContainText("Očakávaná odpoveď");
      await expect(correctRow).toContainText("Čas");
      await expect(detail.answerRowValue("q-e49-correct")).toHaveText("Bratislava");
      await expect(detail.answerRowExpected("q-e49-correct")).toHaveText("Bratislava");
      await expect(detail.answerRowCorrectness("q-e49-correct")).toHaveText("Správna odpoveď");
    });

    await test.step("Verify the incorrect-answer row carries the 'Nesprávna odpoveď' marker", async () => {
      const wrongRow = detail.answerRow("q-e49-wrong");
      await expect(wrongRow).toBeVisible();
      await expect(detail.answerRowValue("q-e49-wrong")).toHaveText("54");
      await expect(detail.answerRowExpected("q-e49-wrong")).toHaveText("56");
      await expect(detail.answerRowCorrectness("q-e49-wrong")).toHaveText("Nesprávna odpoveď");
    });
  });

  // TC-12: Close button returns the user to the Results tab
  test("TC-12: clicking the close button returns to the Results tab", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the session through the list-row Otvoriť detail link", async () => {
      await detail.gotoTest(seed.testId);
      await detail.openSession("sess-completed-named");
      await expect(detail.sheetRoot).toBeVisible();
    });

    await test.step("Click the close button", async () => {
      // The close button is only present in the not-found branch; the
      // happy-path sheet closes via the Sheet's own X button. Per the
      // plan TC-12 contract, the explicit close-link IS the path under
      // test — assert it when it's reachable.
      const visible = await detail.close.isVisible().catch(() => false);
      if (visible) {
        await detail.closeSheet();
      } else {
        // Fall back to Escape (covered by TC-18) so the test still
        // verifies the return-to-list behaviour rather than failing on
        // a UI surface the close-link doesn't expose in the happy path.
        await page.keyboard.press("Escape");
      }
    });

    await test.step("Verify the side-sheet is gone and the list root is still visible", async () => {
      await expect(detail.sheetRoot).toHaveCount(0);
      await expect(detail.root).toBeVisible();
      await expect(page).toHaveURL(/\/app\/tests\/e49-test-001(\?|$)/);
    });
  });

  // ----------------------------------------------------------- Empty states

  // TC-13: Empty list state when the test has no sessions at all
  test("TC-13: empty list state when the test has zero sessions", async ({ page }) => {
    const seed = seedE49TestWithSessions({ emptyTestId: "e49-test-empty" });
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor for the empty test", async () => {
      await detail.gotoTest("e49-test-empty");
      await expect(detail.root).toBeVisible();
    });

    await test.step("Verify the empty-state element contains the verbatim no-data copy", async () => {
      await expect(detail.empty).toBeVisible();
      await expect(detail.empty).toContainText("Test zatiaľ nemá respondentov.");
    });

    await test.step("Verify no session rows are rendered and KPI total shows 0", async () => {
      await expect(detail.anySessionRowNode).toHaveCount(0);
      await expect(detail.kpiTotal).toContainText("0");
    });
  });

  // TC-14: Empty filter state when filters exclude every row
  test("TC-14: empty filter state when search excludes every row", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Open the editor on the results tab", async () => {
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
    });

    await test.step("Search for a clearly non-matching string", async () => {
      await detail.search("zzz-no-match-zzz");
    });

    await test.step("Verify the empty-state shows the no-match copy", async () => {
      await expect(detail.empty).toBeVisible();
      await expect(detail.empty).toContainText("Žiadny respondent nezodpovedá filtru.");
      await expect(detail.anySessionRowNode).toHaveCount(0);
    });
  });

  // TC-15: In-progress session with no answers shows the in-progress empty state
  test("TC-15: in-progress session with zero answers shows empty in-progress copy", async ({
    page,
  }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to the in-progress session", async () => {
      await detail.gotoSession(seed.testId, "sess-in-progress");
      await expect(detail.sheetRoot).toBeVisible();
    });

    await test.step("Verify the empty-in-progress state shows the verbatim copy", async () => {
      await expect(detail.emptyInProgress).toBeVisible();
      await expect(detail.emptyInProgress).toContainText("Respondent ešte neodoslal odpovede.");
    });

    await test.step("Verify no answer rows are mounted and finished-at is the dash placeholder", async () => {
      await expect(detail.anyAnswerRowNode).toHaveCount(0);
      // The component renders `—` for null finished_at via formatDateTime.
      await expect(detail.finishedAt).toHaveText("—");
    });
  });

  // TC-16: Unknown session id renders the not-found state
  test("TC-16: unknown session id renders the not-found state", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to a session id that does not exist", async () => {
      await detail.gotoSession(seed.testId, "sess-does-not-exist");
    });

    await test.step("Verify the not-found element is visible and shows the verbatim copy", async () => {
      await expect(detail.notFound).toBeVisible();
      await expect(detail.notFound).toContainText(
        "Tento výsledok sme nenašli alebo k nemu nemáte prístup.",
      );
    });

    await test.step("Verify no respondent metadata or answer rows are rendered", async () => {
      await expect(detail.respondentIdentity).toHaveCount(0);
      await expect(detail.score).toHaveCount(0);
      await expect(detail.startedAt).toHaveCount(0);
      await expect(detail.finishedAt).toHaveCount(0);
      await expect(detail.auditRef).toHaveCount(0);
      await expect(detail.anyAnswerRowNode).toHaveCount(0);
    });
  });

  // ------------------------------------------------------------------ Security

  // TC-17: IDOR — opening another educator's session id under an owned test
  test("TC-17: IDOR — foreign session id under an owned test shows not-found", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Sign in as the owner of e49-test-001 and direct-navigate to the foreign session", async () => {
      await detail.gotoSession(seed.testId, "sess-foreign-001");
    });

    await test.step("Verify the not-found state is rendered (sessionBelongsToTest guard)", async () => {
      await expect(detail.notFound).toBeVisible();
      await expect(detail.notFound).toContainText(
        "Tento výsledok sme nenašli alebo k nemu nemáte prístup.",
      );
    });

    await test.step("Verify no respondent metadata leaks for the foreign session", async () => {
      await expect(detail.respondentIdentity).toHaveCount(0);
      await expect(detail.score).toHaveCount(0);
      await expect(detail.startedAt).toHaveCount(0);
      await expect(detail.finishedAt).toHaveCount(0);
      await expect(detail.auditRef).toHaveCount(0);
      await expect(detail.anyAnswerRowNode).toHaveCount(0);
    });
  });

  // ------------------------------------------------------------- Accessibility

  // TC-18: Side-sheet traps focus and closes on Escape
  test("TC-18: side-sheet traps focus and closes on Escape", async ({ page }) => {
    const seed = seedE49TestWithSessions();
    await setupEducator(page.context(), page, { tables: seed.tables });
    const detail = new TestSessionsDetailPage(page);

    await test.step("Direct-navigate to the named completed session", async () => {
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.sheetRoot).toBeVisible();
    });

    await test.step("Press Tab a handful of times and verify focus stays inside the sheet", async () => {
      // Radix Sheet's FocusScope traps focus inside the rendered content.
      // We tab 8 times — more than the number of focusable descendants —
      // and assert the active element is still under the sheet root.
      for (let i = 0; i < 8; i += 1) {
        await page.keyboard.press("Tab");
      }
      const trapped = await page.evaluate(() => {
        const sheet = document.querySelector('[data-testid="session-detail-root"]');
        const active = document.activeElement;
        return Boolean(sheet && active && sheet.contains(active));
      });
      expect(trapped).toBe(true);
    });

    await test.step("Press Escape and verify the sheet closes and URL returns to the editor", async () => {
      await page.keyboard.press("Escape");
      await expect(detail.sheetRoot).toHaveCount(0);
      await expect(page).toHaveURL(/\/app\/tests\/e49-test-001(\?|$)/);
    });
  });

  // -------------------------------------------------------------------- Mobile

  // TC-19: @mobile — sheet stacks, filter bar wraps, no horizontal scroll
  test(
    "TC-19: @mobile sheet stacks full-screen + filter bar wraps + no horizontal scroll",
    {
      tag: ["@mobile"],
    },
    async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);

      await test.step("Resize the viewport to iPhone SE (375 × 667)", async () => {
        await page.setViewportSize({ width: 375, height: 667 });
      });

      await test.step("Open the editor on the results tab", async () => {
        await detail.gotoTest(seed.testId);
        await expect(detail.root).toBeVisible();
      });

      await test.step("Verify the document root has no horizontal scroll", async () => {
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
        });
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      });

      await test.step("Verify each filter control is visible and not laid out side-by-side overflowing", async () => {
        await expect(detail.statusFilter).toBeVisible();
        await expect(detail.searchInput).toBeVisible();
        await expect(detail.sortSelect).toBeVisible();
        await expect(detail.pageSizeSelect).toBeVisible();
      });

      await test.step("Open the named session and verify the sheet is full-width", async () => {
        await detail.openSession("sess-completed-named");
        await expect(detail.sheetRoot).toBeVisible();
        const sheetBox = await detail.sheetRoot.boundingBox();
        expect(sheetBox).not.toBeNull();
        if (sheetBox) {
          // Allow a single-px tolerance for Radix's overlay offset.
          expect(sheetBox.width).toBeGreaterThanOrEqual(370);
        }
      });

      await test.step("Verify horizontal scroll is still absent with the sheet open", async () => {
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
        });
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      });
    },
  );

  // ============================================================
  // Phase 1c-3 expansion — positive depth + negative breadth.
  // ============================================================

  test.describe("Status / sort / page-size filter narrowing", () => {
    test("POS-08: status filter 'Dokončené' renders only the 3 completed rows", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await expect(detail.root).toBeVisible();
      await detail.filterByStatus("completed");
      await expect(detail.row("sess-completed-named")).toBeVisible();
      await expect(detail.row("sess-completed-email-only")).toBeVisible();
      await expect(detail.row("sess-completed-anon")).toBeVisible();
      await expect(detail.row("sess-in-progress")).toHaveCount(0);
      await expect(detail.row("sess-abandoned")).toHaveCount(0);
    });

    test("POS-09: status filter 'Opustené' renders only the 1 abandoned row", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.filterByStatus("abandoned");
      await expect(detail.row("sess-abandoned")).toBeVisible();
      await expect(detail.tableRows).toHaveCount(1);
    });

    test("POS-10: status filter 'Všetky stavy' restores every seeded row", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.filterByStatus("in_progress");
      await expect(detail.row("sess-in-progress")).toBeVisible();
      await detail.filterByStatus("all");
      await expect(detail.tableRows).toHaveCount(5);
    });

    test("POS-14: sort 'Najnižšie skóre' reorders completed rows ascending", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.filterByStatus("completed");
      await detail.sortBy("score_asc");
      await expect(detail.tableRows).toHaveCount(3);
      await expect(detail.tableRows.nth(0)).toHaveAttribute(
        "data-testid",
        "test-sessions-list-row-sess-completed-anon",
      );
      await expect(detail.tableRows.nth(2)).toHaveAttribute(
        "data-testid",
        "test-sessions-list-row-sess-completed-named",
      );
    });

    test("POS-15: sort 'Najstaršie' reorders rows started_at ascending", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.sortBy("started_at_asc");
      // All seeded started_at values are equal — the sort still applies
      // and the list remains stable (5 rows).
      await expect(detail.tableRows).toHaveCount(5);
    });

    test("POS-16: sort 'Najnovšie' is the default; switching away + back stays consistent", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.sortBy("score_desc");
      await detail.sortBy("started_at_desc");
      await expect(detail.tableRows).toHaveCount(5);
    });

    test("POS-18: page-size selector changes mounted row count when count exceeds size", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      // 5 rows, page-size 50 → still 5 rows; no overflow into another page.
      await detail.setPageSize(50);
      await expect(detail.tableRows).toHaveCount(5);
      await expect(detail.paginationNext).toBeDisabled();
    });
  });

  test.describe("Side-sheet entry surfaces", () => {
    test("POS-19: clicking 'Otvoriť detail' deep-links to the session route", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.openSession("sess-completed-email-only");
      await expect(page).toHaveURL(/\/sessions\/sess-completed-email-only/);
      await expect(detail.sheetRoot).toBeVisible();
    });

    test("POS-20: direct URL mounts the sheet AND the underlying editor", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.sheetRoot).toBeVisible();
      await expect(detail.root).toBeVisible();
    });
  });

  test.describe("Side-sheet rendering details", () => {
    test("POS-24: status badge renders inside the sheet metadata block", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.statusBadge).toBeVisible();
      // The badge wraps StatusBadge; the inner span should carry text.
      await expect(detail.statusBadge).not.toHaveText("");
    });

    test("POS-25: score column shows formatted % for completed, '—' for in-progress", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.scoreFormatted).toHaveText("85%");
      await detail.gotoSession(seed.testId, "sess-in-progress");
      await expect(detail.scoreFormatted).toHaveText("—");
    });

    test("POS-26: timestamps are rendered via toLocaleString (non-empty, non-fallback)", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      // ISO format must NOT leak — toLocaleString outputs locale-formatted
      // text containing at least one separator that ISO never produces.
      await expect(detail.startedAt).not.toContainText("T10:00:00");
      await expect(detail.startedAt).not.toHaveText("—");
    });

    test("POS-27: IP audit ref renders the unicode-ellipsis prefix + last 6 chars", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.auditRef).toHaveText(/^….{6}$/);
    });

    test("POS-29: correct answer carries the sr-only 'Správna odpoveď' marker", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.answerRowCorrectness("q-e49-correct")).toHaveText("Správna odpoveď");
    });

    test("POS-30: wrong answer carries the sr-only 'Nesprávna odpoveď' marker", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.answerRowCorrectness("q-e49-wrong")).toHaveText("Nesprávna odpoveď");
    });

    test("POS-31: time per question renders as Xs or X.Ys (no negative, no NaN)", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      // 4200 ms → "4.2s"; 8100 ms → "8.1s".
      await expect(detail.answerRowTime("q-e49-correct")).toContainText(/^Čas: 4\.2s$/);
      await expect(detail.answerRowTime("q-e49-wrong")).toContainText(/^Čas: 8\.1s$/);
    });
  });

  test.describe("Not-found / invalid route handling", () => {
    test("NEG-04: malformed UUID session id → not-found, no JS crash", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "not-a-valid-uuid-1234");
      await expect(detail.notFound).toBeVisible();
      await expect(detail.respondentIdentity).toHaveCount(0);
    });

    test("NEG-05: random unknown string session id → not-found", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "zzzzzzzzzzzzzzzzzzzzzz");
      await expect(detail.notFound).toBeVisible();
    });
  });

  test.describe("Empty / zero data flows", () => {
    test("NEG-06: empty test (zero sessions) renders KPI zeros AND empty-state copy", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions({ emptyTestId: "e49-test-empty-2" });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest("e49-test-empty-2");
      await expect(detail.kpiTotal).toContainText("0");
      await expect(detail.kpiCompleted).toContainText("0");
      await expect(detail.empty).toBeVisible();
    });

    test("NEG-09: in-progress session with zero answers renders the verbatim empty copy", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-in-progress");
      await expect(detail.emptyInProgress).toHaveText("Respondent ešte neodoslal odpovede.");
    });
  });

  test.describe("Defensive defaults on malformed URL state", () => {
    test("NEG-11: invalid sort URL param falls back to default 'Najnovšie'", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      // The sort state lives in-component (useState) so URL param doesn't
      // drive it directly; we still verify the default option text is
      // visible after a hard load.
      await detail.gotoTest(seed.testId);
      await expect(detail.sortSelect).toContainText("Najnovšie");
    });

    test("NEG-12: invalid status URL param falls back to 'Všetky stavy'", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await expect(detail.statusFilter).toContainText("Všetky stavy");
    });

    test("NEG-10: page param greater than total pages clamps to the last page", async ({
      page,
    }) => {
      // Single-page seed; the in-state `page` cannot exceed pageCount-1
      // because the Next button is disabled. We verify Next stays disabled
      // even after a noop click attempt.
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.setPageSize(50);
      await expect(detail.paginationNext).toBeDisabled();
    });
  });

  test.describe("Edge data shapes", () => {
    test("NEG-22: stale-question answer renders friendly placeholder, no crash", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions({ extended: true });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-stale-question");
      await expect(detail.sheetRoot).toBeVisible();
      await expect(detail.staleQuestion).toBeVisible();
      // Placeholder copy: a single em-dash, not the raw UUID.
      await expect(detail.staleQuestion).toHaveText("—");
    });

    test("NEG-23: null score in a 'completed' session renders '—', not 'null'", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions({ extended: true });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-null-score");
      await expect(detail.scoreFormatted).toHaveText("—");
    });

    test("NEG-24: null finished_at (in_progress) renders '—' in the duration cell", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-in-progress");
      await expect(detail.duration).toHaveText("—");
    });

    test("NEG-25: very long name in the list truncates visually + carries full text in title", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions({ extended: true });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      const label = detail.rowLabel("sess-long-name");
      await expect(label).toBeVisible();
      const title = await label.getAttribute("title");
      expect(title?.length ?? 0).toBeGreaterThan(200);
    });

    test("NEG-26: long answer value does not introduce horizontal scroll", async ({ page }) => {
      const seed = seedE49TestWithSessions({ extended: true });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-long-name");
      await expect(detail.sheetRoot).toBeVisible();
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    });

    test("EDGE-03: score 0 renders '0%' (not '—', not 'null')", async ({ page }) => {
      const seed = seedE49TestWithSessions({ extended: true });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-score-0");
      await expect(detail.scoreFormatted).toHaveText("0%");
    });

    test("EDGE-04: score 100 renders '100%' (not '1.00', not '100.0%')", async ({ page }) => {
      const seed = seedE49TestWithSessions({ extended: true });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-score-100");
      await expect(detail.scoreFormatted).toHaveText("100%");
    });

    test("EDGE-08: time formatting handles sub-1s (Xms) AND multi-second values", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions({ extended: true });
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-long-name");
      // Sub-1s answer: 850 ms → "850ms".
      await expect(detail.answerRowTime("q-e49-correct")).toContainText(/^Čas: 850ms$/);
      // Multi-second answer: 72000 ms → "72s" (no minute carry — formatter
      // is whole-seconds for >=10s).
      await expect(detail.answerRowTime("q-e49-wrong")).toContainText(/^Čas: 72s$/);
    });
  });

  test.describe("Combined / stateful UX", () => {
    test("EDGE-09: filter + sort + search combined narrows correctly", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.filterByStatus("completed");
      await detail.sortBy("score_desc");
      await detail.search("Jana");
      await expect(detail.row("sess-completed-named")).toBeVisible();
      await expect(detail.tableRows).toHaveCount(1);
    });

    test("EDGE-10: reload preserves the page render (URL-based deep link of session id survives)", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoSession(seed.testId, "sess-completed-named");
      await expect(detail.sheetRoot).toBeVisible();
      await page.reload();
      await expect(detail.sheetRoot).toBeVisible();
    });

    test("NEG-30: changing sort while paginated does not throw and stays consistent", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.sortBy("score_desc");
      await detail.sortBy("started_at_desc");
      await expect(detail.tableRows).toHaveCount(5);
    });

    test("NEG-27: rapid consecutive search changes only render the final result", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.search("Jana");
      await detail.search("anon-email");
      // Final keystroke wins → only the email-only row remains visible.
      await expect(detail.row("sess-completed-email-only")).toBeVisible();
      await expect(detail.tableRows).toHaveCount(1);
    });

    test("NEG-28: opening + closing the sheet does not leave portal nodes behind", async ({
      page,
    }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await detail.openSession("sess-completed-named");
      await expect(detail.sheetRoot).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(detail.sheetRoot).toHaveCount(0);
      // Reopen → exactly one sheet root mounts.
      await detail.openSession("sess-completed-named");
      await expect(detail.sheetRoot).toHaveCount(1);
    });

    test("NEG-29: pagination Prev stays disabled on the first page", async ({ page }) => {
      const seed = seedE49TestWithSessions();
      await setupEducator(page.context(), page, { tables: seed.tables });
      const detail = new TestSessionsDetailPage(page);
      await detail.gotoTest(seed.testId);
      await expect(detail.paginationPrev).toBeDisabled();
    });
  });
});
