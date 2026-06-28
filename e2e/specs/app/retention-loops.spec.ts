import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppInsightsPage } from "../../poms/app/AppInsightsPage";

// ---------------------------------------------------------------------------
// M4 — the four retention loops live under /app/insights as tabs
// (?tab=digest|recommendations|retest|peer). Old single-list routes
// redirect; section markup keeps the pre-merge data-testids.
//
// Shared seed helpers — plain objects matching the PostgREST row shape.
// No factory functions exist yet for these tables; kept inline so the
// mock envelope receives exactly the columns each query selects.
// ---------------------------------------------------------------------------

function makeDigestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "digest-01",
    period_start: "2026-05-12T00:00:00.000Z",
    period_end: "2026-05-18T23:59:59.000Z",
    stats: {
      sessions_count: 5,
      completion_rate: 80,
      top_test_id: null,
      top_test_title: null,
      weakest_question_text: null,
      weakest_question_score: null,
    },
    generated_at: "2026-05-19T00:00:00.000Z",
    opened_at: null,
    ...overrides,
  };
}

function makeRecommendationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec-01",
    training_id: "training-01",
    reason_key: "new_content",
    score_at_rec: null,
    branch_slug: null,
    dismissed_at: null,
    clicked_at: null,
    sent_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    training: {
      id: "training-01",
      title: "Kritické myslenie — základy",
      slug: "kriticke-myslenie-zaklady",
      estimated_minutes: 45,
    },
    ...overrides,
  };
}

function makeRetestReminderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "retest-01",
    test_id: "test-retest-01",
    last_score: 72,
    sessions_count: 3,
    last_session_at: "2026-02-01T00:00:00.000Z",
    remind_after: "2026-01-01",
    dismissed_at: null,
    snoozed_until: null,
    retested_at: null,
    test: {
      id: "test-retest-01",
      title: "Finančná gramotnosť",
      status: "published",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Section A — digest tab
// ---------------------------------------------------------------------------

test.describe("/app/insights?tab=digest", () => {
  // TC-01: Empty state when the user has no digest history.
  test("TC-01: empty state renders when user_digests is empty", async ({ page }) => {
    await setupEducator(page.context(), page, {
      tables: { user_digests: [] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=digest", async () => {
      await insights.open("digest");
    });

    await test.step("Verify the digest tab is active and its panel visible", async () => {
      await expect(insights.tab("digest")).toHaveAttribute("data-state", "active");
      await expect(insights.panel("digest")).toBeVisible();
    });

    await test.step("Verify the empty-state card is visible", async () => {
      await expect(insights.digestEmptyState).toBeVisible();
    });

    await test.step("Verify the empty-state title reads 'Zatiaľ žiadny súhrn'", async () => {
      await expect(insights.digestEmptyTitle).toHaveText("Zatiaľ žiadny súhrn");
    });

    await test.step("Verify the page-header eyebrow reads 'Pre teba'", async () => {
      await expect(insights.pageHeaderEyebrow).toHaveText("Pre teba");
    });
  });

  // TC-02: Populated state — digest card renders with period label and session stat.
  test("TC-02: populated digest card shows sessions and completion stats", async ({ page }) => {
    const row = makeDigestRow();
    await setupEducator(page.context(), page, {
      tables: { user_digests: [row] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=digest", async () => {
      await insights.open("digest");
    });

    await test.step("Verify the digest list is visible", async () => {
      await expect(insights.digestList).toBeVisible();
    });

    await test.step("Verify the digest card for the seeded row is visible", async () => {
      await expect(insights.digestCard(row.id as string)).toBeVisible();
    });

    await test.step("Verify the sessions stat shows '5 dokončení'", async () => {
      await expect(insights.digestCardSessions(row.id as string)).toHaveText("5 dokončení");
    });

    await test.step("Verify the completion stat shows 'Úspešnosť 80%'", async () => {
      await expect(insights.digestCardCompletion(row.id as string)).toHaveText("Úspešnosť 80%");
    });
  });

  // TC-03: Populated digest card shows "Pozri detail" CTA linking to /app/tests/$testId.
  test("TC-03: top-test section renders with 'Pozri detail' CTA linking to the test", async ({
    page,
  }) => {
    const testId = "test-abc-123";
    const row = makeDigestRow({
      stats: {
        sessions_count: 2,
        completion_rate: 60,
        top_test_id: testId,
        top_test_title: "Test čítania s porozumením",
        weakest_question_text: null,
        weakest_question_score: null,
      },
    });
    await setupEducator(page.context(), page, {
      tables: { user_digests: [row] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=digest", async () => {
      await insights.open("digest");
    });

    await test.step("Verify the top-test section is visible", async () => {
      await expect(insights.digestCardTopTest(row.id as string)).toBeVisible();
    });

    await test.step("Verify the 'Pozri detail' CTA links to /app/tests/{testId}", async () => {
      await expect(insights.digestCardTopTestCta(row.id as string)).toHaveAttribute(
        "href",
        `/app/tests/${testId}`,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Section B — recommendations tab
// ---------------------------------------------------------------------------

test.describe("/app/insights?tab=recommendations", () => {
  // TC-04: Empty state when no course recommendations exist.
  test("TC-04: empty state renders when course_recommendations is empty", async ({ page }) => {
    await setupEducator(page.context(), page, {
      tables: { course_recommendations: [] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=recommendations", async () => {
      await insights.open("recommendations");
    });

    await test.step("Verify the recommendations tab is active", async () => {
      await expect(insights.tab("recommendations")).toHaveAttribute("data-state", "active");
    });

    await test.step("Verify the empty-state card is visible", async () => {
      await expect(insights.recommendationsEmptyState).toBeVisible();
    });

    await test.step("Verify the empty-state title reads 'Zatiaľ žiadne odporúčania'", async () => {
      await expect(insights.recommendationsEmptyTitle).toHaveText("Zatiaľ žiadne odporúčania");
    });
  });

  // TC-05: Populated state — recommendation card renders with title and reason badge.
  test("TC-05: populated recommendation card shows training title and reason badge", async ({
    page,
  }) => {
    const row = makeRecommendationRow();
    await setupEducator(page.context(), page, {
      tables: { course_recommendations: [row] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=recommendations", async () => {
      await insights.open("recommendations");
    });

    await test.step("Verify the recommendations list is visible", async () => {
      await expect(insights.recommendationsList).toBeVisible();
    });

    await test.step("Verify the card title shows the training title", async () => {
      await expect(insights.recommendationsCardTitle(row.id as string)).toHaveText(
        "Kritické myslenie — základy",
      );
    });

    await test.step("Verify the reason badge shows 'Nový obsah'", async () => {
      await expect(insights.recommendationsCardReason(row.id as string)).toHaveText("Nový obsah");
    });
  });

  // TC-06: "Pozri kurz" CTA links to /academy/$slug when training has a slug.
  test("TC-06: 'Pozri kurz' CTA href points to /academy/{slug}", async ({ page }) => {
    const row = makeRecommendationRow();
    await setupEducator(page.context(), page, {
      tables: { course_recommendations: [row] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=recommendations", async () => {
      await insights.open("recommendations");
    });

    await test.step("Verify the 'Pozri kurz' CTA has the correct href", async () => {
      await expect(insights.recommendationsCardViewCta(row.id as string)).toHaveAttribute(
        "href",
        "/academy/kriticke-myslenie-zaklady",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Section C — retest tab
// ---------------------------------------------------------------------------

test.describe("/app/insights?tab=retest", () => {
  // TC-07: Empty state when no retest reminders exist.
  test("TC-07: empty state renders when retest_reminders is empty", async ({ page }) => {
    await setupEducator(page.context(), page, {
      tables: { retest_reminders: [] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=retest", async () => {
      await insights.open("retest");
    });

    await test.step("Verify the retest tab is active", async () => {
      await expect(insights.tab("retest")).toHaveAttribute("data-state", "active");
    });

    await test.step("Verify the empty-state card is visible", async () => {
      await expect(insights.retestEmptyState).toBeVisible();
    });

    await test.step("Verify the empty-state title reads 'Zatiaľ žiadne pripomienky'", async () => {
      await expect(insights.retestEmptyTitle).toHaveText("Zatiaľ žiadne pripomienky");
    });
  });

  // TC-08: Due section visible when remind_after is in the past.
  test("TC-08: due section and run-retest CTA visible for a past-due reminder", async ({
    page,
  }) => {
    const row = makeRetestReminderRow();
    await setupEducator(page.context(), page, {
      tables: { retest_reminders: [row] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=retest", async () => {
      await insights.open("retest");
    });

    await test.step("Verify the due section is visible", async () => {
      await expect(insights.retestDueSection).toBeVisible();
    });

    await test.step("Verify the reminder card shows the test title 'Finančná gramotnosť'", async () => {
      await expect(insights.retestCardTitle(row.id as string)).toHaveText("Finančná gramotnosť");
    });

    await test.step("Verify the 'Spustiť retest' CTA links to /app/tests/{test_id}", async () => {
      await expect(insights.retestCardRunCta(row.id as string)).toHaveAttribute(
        "href",
        `/app/tests/${row.test_id as string}`,
      );
    });
  });

  // TC-09: Upcoming section visible when remind_after is in the future.
  test("TC-09: upcoming section visible for a future remind_after date", async ({ page }) => {
    const row = makeRetestReminderRow({
      id: "retest-future-01",
      remind_after: "2099-12-31",
    });
    await setupEducator(page.context(), page, {
      tables: { retest_reminders: [row] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=retest", async () => {
      await insights.open("retest");
    });

    await test.step("Verify the upcoming section is visible", async () => {
      await expect(insights.retestUpcomingSection).toBeVisible();
    });

    await test.step("Verify the due-in label contains 'Splatné o'", async () => {
      await expect(insights.retestCardDueIn(row.id as string)).toContainText("Splatné o");
    });
  });
});

// ---------------------------------------------------------------------------
// Section D — peer tab
// ---------------------------------------------------------------------------

test.describe("/app/insights?tab=peer", () => {
  // TC-10: Insufficient-cohort empty state when RPC returns has_data: false.
  test("TC-10: insufficient-cohort card shown when get_peer_card returns has_data: false", async ({
    page,
  }) => {
    await setupEducator(page.context(), page, {
      rpcs: {
        get_peer_card: { has_data: false, reason: "insufficient_cohort" },
      },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=peer", async () => {
      await insights.open("peer");
    });

    await test.step("Verify the peer tab is active", async () => {
      await expect(insights.tab("peer")).toHaveAttribute("data-state", "active");
    });

    await test.step("Verify the insufficient-cohort card is visible", async () => {
      await expect(insights.peerEmptyInsufficientCard).toBeVisible();
    });

    await test.step("Verify the body text reads the expected message", async () => {
      await expect(insights.peerEmptyInsufficientBody).toHaveText(
        "Zatiaľ máme málo dát na porovnanie. Vráť sa o pár týždňov.",
      );
    });

    await test.step("Verify the percentile card is NOT rendered", async () => {
      await expect(insights.peerPercentileCard).toHaveCount(0);
    });
  });

  // TC-11: Populated state — percentile card + score rows visible.
  test("TC-11: populated peer card shows percentile headline and score values", async ({
    page,
  }) => {
    await setupEducator(page.context(), page, {
      rpcs: {
        get_peer_card: {
          has_data: true,
          user_percentile: 75,
          user_score: 68,
          user_attempts: 12,
          cohort_avg: 52,
          cohort_size: 200,
          branch_ranks: [],
        },
      },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=peer", async () => {
      await insights.open("peer");
    });

    await test.step("Verify the percentile card is visible", async () => {
      await expect(insights.peerPercentileCard).toBeVisible();
    });

    await test.step("Verify the percentile headline contains '75. percentil'", async () => {
      await expect(insights.peerPercentileHeadline).toContainText("75. percentil");
    });

    await test.step("Verify the user score value contains '68%'", async () => {
      await expect(insights.peerScoreUserValue).toContainText("68%");
    });

    await test.step("Verify the cohort score value contains '52%'", async () => {
      await expect(insights.peerScoreCohortValue).toContainText("52%");
    });
  });

  // TC-12: Download button visible with correct label when has_data: true.
  test("TC-12: download button shows 'Stiahnuť ako obrázok' and privacy note is visible", async ({
    page,
  }) => {
    await setupEducator(page.context(), page, {
      rpcs: {
        get_peer_card: {
          has_data: true,
          user_percentile: 60,
          user_score: 55,
          user_attempts: 8,
          cohort_avg: 50,
          cohort_size: 150,
          branch_ranks: [],
        },
      },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights?tab=peer", async () => {
      await insights.open("peer");
    });

    await test.step("Verify the download button is visible", async () => {
      await expect(insights.peerShareDownloadButton).toBeVisible();
    });

    await test.step("Verify the download button label reads 'Stiahnuť ako obrázok'", async () => {
      await expect(insights.peerShareDownloadButton).toContainText("Stiahnuť ako obrázok");
    });

    await test.step("Verify the privacy note is visible", async () => {
      await expect(insights.peerPrivacyNote).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// Section E — tab switching + legacy-route redirects
// ---------------------------------------------------------------------------

test.describe("/app/insights — tabs and legacy redirects", () => {
  // TC-13: Default tab is digest; clicking another tab updates ?tab=.
  test("TC-13: digest is the default tab and clicking 'Retesty' updates the URL", async ({
    page,
  }) => {
    await setupEducator(page.context(), page, {
      tables: { user_digests: [], retest_reminders: [] },
    });

    const insights = new AppInsightsPage(page);

    await test.step("Open /app/insights without a ?tab param", async () => {
      await insights.open();
    });

    await test.step("Verify the digest tab is active by default", async () => {
      await expect(insights.tab("digest")).toHaveAttribute("data-state", "active");
      await expect(insights.digestRoot).toBeVisible();
    });

    await test.step("Click the 'Retesty' tab and verify ?tab=retest + retest section", async () => {
      await insights.tab("retest").click();
      await expect(page).toHaveURL(/\/app\/insights\?tab=retest/);
      await expect(insights.retestRoot).toBeVisible();
    });
  });

  // TC-14: Old routes redirect to the matching insights tab (deep links keep working).
  for (const [oldPath, tab] of [
    ["/app/digest", "digest"],
    ["/app/recommendations", "recommendations"],
    ["/app/retest", "retest"],
    ["/app/peer", "peer"],
  ] as const) {
    test(`TC-14: legacy ${oldPath} redirects to /app/insights?tab=${tab}`, async ({ page }) => {
      await setupEducator(page.context(), page, {
        tables: { user_digests: [], retest_reminders: [], course_recommendations: [] },
        rpcs: { get_peer_card: { has_data: false, reason: "insufficient_cohort" } },
      });

      const insights = new AppInsightsPage(page);

      await test.step(`Navigate to the legacy ${oldPath} URL`, async () => {
        await page.goto(oldPath, { waitUntil: "domcontentloaded" });
      });

      await test.step(`Verify the URL is /app/insights?tab=${tab} and the tab is active`, async () => {
        await expect(page).toHaveURL(new RegExp(`/app/insights\\?tab=${tab}`));
        await expect(insights.tab(tab)).toHaveAttribute("data-state", "active");
      });
    });
  }
});
