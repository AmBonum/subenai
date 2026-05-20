import { describe, it, expect } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { RespondentDetailContent } from "@/components/composer/edu/dashboard/RespondentDetailContent";
import type { RespondentRow } from "@/lib/edu/types";

// E38 Phase B — drill-down content unit tests.
//
// Same arithmetic surface as the old RespondentDetailModal tests (per-
// category rollup math, status-enum mapping, question-bank lookup
// fallback, parseAnswers() degradation for historical rows) but
// targeted at the route-rendered content component now that the modal
// is gone. Page chrome (heading, prev/next nav) lives on the route
// itself and is exercised by the round-trip e2e + a dedicated route
// test below.

// `p-sms-posta-1` is the very first question in the bank (`QUESTIONS[0]`).
const REAL_Q_ID = "p-sms-posta-1";

function makeRow(overrides: Partial<RespondentRow> = {}): RespondentRow {
  return {
    id: "att-1",
    share_id: "AAAA1111",
    respondent_name: "Anna Testovacia",
    respondent_email: "anna@example.sk",
    final_score: 60,
    percentile: 50,
    total_time_ms: 73_000,
    created_at: "2026-05-20T10:00:00Z",
    answers: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("RespondentDetailContent — E38 Phase B drill-down body", () => {
  it("shows the documented fallback when the row has no parseable answers (historical / pre-feature rows)", () => {
    render(<RespondentDetailContent row={makeRow({ answers: null })} />);
    expect(screen.getByTestId("respondent-detail-fallback")).toBeVisible();
    expect(screen.queryByTestId("respondent-detail-questions")).toBeNull();
  });

  it("renders a question row with the prompt text, status badge, and Slovak picked / correct labels", () => {
    const answers = [
      {
        questionId: REAL_Q_ID,
        optionId: "x",
        correct: false,
        severity: "medium" as const,
        responseMs: 4500,
        category: "phishing" as const,
        difficulty: "easy" as const,
      },
    ];
    render(<RespondentDetailContent row={makeRow({ answers })} />);
    const row = screen.getByTestId(`respondent-detail-question-${REAL_Q_ID}`);
    expect(row).toBeVisible();
    expect(row.textContent).toContain("Vybraná odpoveď:");
    expect(row.textContent).toContain("Správna odpoveď:");
    expect(within(row).getByText("Nesprávne")).toBeVisible();
  });

  it("marks an answer with optionId=null as 'Nezodpovedaná' (skipped state)", () => {
    const answers = [
      {
        questionId: REAL_Q_ID,
        optionId: null,
        correct: false,
        severity: null,
        responseMs: 30_000,
        category: "phishing" as const,
        difficulty: "easy" as const,
      },
    ];
    render(<RespondentDetailContent row={makeRow({ answers })} />);
    const row = screen.getByTestId(`respondent-detail-question-${REAL_Q_ID}`);
    expect(within(row).getByText("Nezodpovedaná")).toBeVisible();
    expect(row.textContent).toContain("(nevybrané)");
  });

  it("rolls up correct/total per category when multiple categories present + flags weak categories (< 50 %) with amber styling", () => {
    const answers = [
      {
        questionId: REAL_Q_ID,
        optionId: "x",
        correct: false,
        severity: "medium" as const,
        responseMs: 1000,
        category: "phishing" as const,
        difficulty: "easy" as const,
      },
      {
        questionId: REAL_Q_ID,
        optionId: "x",
        correct: false,
        severity: "medium" as const,
        responseMs: 1000,
        category: "phishing" as const,
        difficulty: "easy" as const,
      },
      {
        questionId: REAL_Q_ID,
        optionId: "x",
        correct: true,
        severity: null,
        responseMs: 1000,
        category: "url" as const,
        difficulty: "easy" as const,
      },
    ];
    render(<RespondentDetailContent row={makeRow({ answers })} />);

    const phishingCard = screen.getByTestId("respondent-detail-category-phishing");
    expect(phishingCard.textContent).toContain("0 z 2");
    expect(phishingCard.className).toContain("amber");

    const urlCard = screen.getByTestId("respondent-detail-category-url");
    expect(urlCard.textContent).toContain("1 z 1");
    expect(urlCard.className).not.toContain("amber");
  });

  it("hides the per-category strip when only one category is present (no comparison to make)", () => {
    const answers = [
      {
        questionId: REAL_Q_ID,
        optionId: "x",
        correct: false,
        severity: "medium" as const,
        responseMs: 1000,
        category: "phishing" as const,
        difficulty: "easy" as const,
      },
    ];
    render(<RespondentDetailContent row={makeRow({ answers })} />);
    expect(screen.queryByTestId("respondent-detail-category-strip")).toBeNull();
  });

  it("renders the question-removed fallback when the bank no longer carries the questionId", () => {
    const answers = [
      {
        questionId: "this-question-id-does-not-exist-in-the-bank",
        optionId: "x",
        correct: false,
        severity: "medium" as const,
        responseMs: 1000,
        category: "phishing" as const,
        difficulty: "easy" as const,
      },
    ];
    render(<RespondentDetailContent row={makeRow({ answers })} />);
    const row = screen.getByTestId(
      "respondent-detail-question-this-question-id-does-not-exist-in-the-bank",
    );
    expect(row.textContent).toContain("bola medzitým odstránená z banky");
  });
});
