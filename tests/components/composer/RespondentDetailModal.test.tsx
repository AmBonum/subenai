import { describe, it, expect, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { RespondentDetailModal } from "@/components/composer/edu/dashboard/RespondentDetailModal";
import type { RespondentRow } from "@/lib/edu/types";

// E34 Phase 1 — drill-down modal unit tests.
//
// Why a unit test on top of the e2e in round-trip.spec.ts: the modal does
// real work the e2e can't easily assert — per-category rollup math,
// status-enum mapping (correct / wrong / skipped), question-bank lookup
// fallback when an id has been removed, parseAnswers() degradation for
// historical rows. Those are arithmetic / branching paths, not visual
// flows, so Vitest is the right speed/granularity.

// `p-sms-posta-1` is the very first question in the bank (`QUESTIONS[0]`).
// Stable across migrations; picked because we need a real question id the
// modal can look up via `getQuestionById()` without mocking the bank.
const REAL_Q_ID = "p-sms-posta-1";

function makeRow(overrides: Partial<RespondentRow> = {}): RespondentRow {
  return {
    id: "att-1",
    share_id: "AAAA1111",
    respondent_name: "Anna Testovacia",
    respondent_email: "anna@example.sk",
    final_score: 60,
    percentile: 50,
    total_time_ms: 73_000, // 73 s → "73 s" in subtitle
    created_at: "2026-05-20T10:00:00Z",
    answers: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("RespondentDetailModal — E34 Phase 1 drill-down", () => {
  it("renders nothing when row is null (closed state)", () => {
    render(<RespondentDetailModal row={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId("respondent-detail-root")).toBeNull();
  });

  it("renders heading + subtitle with the respondent's name, email, score, and time-in-seconds", () => {
    render(<RespondentDetailModal row={makeRow()} onClose={vi.fn()} />);

    const heading = screen.getByTestId("respondent-detail-heading");
    expect(heading.textContent).toContain("Anna Testovacia");

    const subtitle = screen.getByTestId("respondent-detail-subtitle");
    expect(subtitle.textContent).toContain("anna@example.sk");
    expect(subtitle.textContent).toContain("60");
    expect(subtitle.textContent).toContain("73");
  });

  it("shows the documented fallback when the row has no parseable answers (historical / pre-feature rows)", () => {
    render(<RespondentDetailModal row={makeRow({ answers: null })} onClose={vi.fn()} />);
    expect(screen.getByTestId("respondent-detail-fallback")).toBeVisible();
    // No per-question section when there's no data to render.
    expect(screen.queryByTestId("respondent-detail-questions")).toBeNull();
  });

  it("renders a question row with the prompt text, status badge, and Slovak picked / correct labels", () => {
    const answers = [
      {
        questionId: REAL_Q_ID,
        optionId: "x", // wrong, deliberate
        correct: false,
        severity: "medium" as const,
        responseMs: 4500,
        category: "phishing" as const,
        difficulty: "easy" as const,
      },
    ];
    render(<RespondentDetailModal row={makeRow({ answers })} onClose={vi.fn()} />);

    const row = screen.getByTestId(`respondent-detail-question-${REAL_Q_ID}`);
    expect(row).toBeVisible();
    expect(row.textContent).toContain("Vybraná odpoveď:");
    expect(row.textContent).toContain("Správna odpoveď:");
    // Wrong status badge ("Nesprávne") in Slovak.
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
    render(<RespondentDetailModal row={makeRow({ answers })} onClose={vi.fn()} />);
    const row = screen.getByTestId(`respondent-detail-question-${REAL_Q_ID}`);
    expect(within(row).getByText("Nezodpovedaná")).toBeVisible();
    // Picked column reads "(nevybrané)" rather than an empty cell.
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
    render(<RespondentDetailModal row={makeRow({ answers })} onClose={vi.fn()} />);

    const phishingCard = screen.getByTestId("respondent-detail-category-phishing");
    // 0 of 2 correct → 0 %, weak (amber border).
    expect(phishingCard.textContent).toContain("0 z 2");
    expect(phishingCard.className).toContain("amber");

    const urlCard = screen.getByTestId("respondent-detail-category-url");
    // 1 of 1 → 100 %, not weak.
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
    render(<RespondentDetailModal row={makeRow({ answers })} onClose={vi.fn()} />);
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
    render(<RespondentDetailModal row={makeRow({ answers })} onClose={vi.fn()} />);
    const row = screen.getByTestId(
      "respondent-detail-question-this-question-id-does-not-exist-in-the-bank",
    );
    expect(row.textContent).toContain("bola medzitým odstránená z banky");
  });
});
