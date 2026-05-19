import type { Page } from "@playwright/test";

export interface AttemptStubRow {
  share_id: string;
  final_score: number;
  percentile: number;
  personality: string;
  breakdown: Record<"phishing" | "url" | "fake_vs_real" | "scenario", number>;
  insights: string[];
  stats: {
    criticalMistakes: number;
    mediumMistakes: number;
    minorMistakes: number;
    avgResponseMs: number;
    totalTimeMs: number;
  };
  answers: unknown;
  created_at: string;
}

export interface AttemptsByShareIdStub {
  row: AttemptStubRow | null;
  /** HTTP status for the DELETE stub. Defaults to 204. */
  deleteStatus?: number;
}

/** Default valid row — override fields as needed for edge cases. */
export function makeAttemptRow(overrides: Partial<AttemptStubRow> = {}): AttemptStubRow {
  return {
    share_id: "TESTAAAA",
    final_score: 75,
    percentile: 70,
    personality: "internet_ninja",
    breakdown: { phishing: 80, url: 70, fake_vs_real: 60, scenario: 90 },
    insights: [],
    stats: {
      criticalMistakes: 0,
      mediumMistakes: 1,
      minorMistakes: 2,
      avgResponseMs: 4000,
      totalTimeMs: 60_000,
    },
    answers: [],
    created_at: "2026-05-19T00:00:00Z",
    ...overrides,
  };
}

/**
 * Intercepts the Supabase REST call that /r/$shareId makes to read the
 * attempts row and optionally the DELETE call the delete flow makes.
 *
 * The GET stub routes the pattern for /rest/v1/attempts. Supabase-js
 * maybeSingle() sends Accept: application/vnd.pgrst.object+json — PostgREST
 * responds with a single JSON object when found, or HTTP 406 with an empty
 * body when zero rows match. Supabase-js treats a 406 from maybeSingle() as
 * data: null.
 *
 * The DELETE stub intercepts the same URL pattern and returns 204 No Content.
 */
export async function stubAttemptsByShareId(
  page: Page,
  stub: AttemptsByShareIdStub,
): Promise<void> {
  await page.route("**/rest/v1/attempts*", async (route) => {
    const method = route.request().method().toUpperCase();

    if (method === "DELETE") {
      await route.fulfill({
        status: stub.deleteStatus ?? 204,
        body: "",
      });
      return;
    }

    if (stub.row === null) {
      // .maybeSingle() maps a PostgREST 406 (PGRST116 — "query returned
      // more than one row" / "no rows") to { data: null, error: null }.
      // For the "not found" case we return 406 which supabase-js normalises
      // to data=null without surfacing an error to the component.
      await route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify({ code: "PGRST116", message: "The result contains 0 rows" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/vnd.pgrst.object+json",
      body: JSON.stringify(stub.row),
    });
  });
}
