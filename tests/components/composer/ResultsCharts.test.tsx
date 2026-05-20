import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Recharts' ResponsiveContainer reads the parent DOM rect to decide what
// size to render at; jsdom returns zeros so charts collapse to nothing
// visible. Swap it for a fixed-size wrapper before the component imports
// fire — the visualisation itself still renders, just at a known size.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 320, height: 180 }}>{children}</div>
    ),
  };
});

import { ResultsCharts } from "@/components/composer/edu/dashboard/ResultsCharts";
import type { AggregateStats, RespondentRow } from "@/lib/edu/types";

const stats = (over: Partial<AggregateStats> = {}): AggregateStats => ({
  count: 10,
  avg_score: 72,
  min_score: 30,
  max_score: 100,
  median_score: 75,
  passing_threshold: 70,
  pass_count: 6,
  pass_rate: 60,
  histogram: [1, 2, 3, 4],
  ...over,
});

const row = (over: Partial<RespondentRow> = {}): RespondentRow => ({
  id: "att-x",
  share_id: "ABC23456",
  respondent_name: "Test User",
  respondent_email: "test@skola.sk",
  final_score: 80,
  percentile: 75,
  total_time_ms: 90_000,
  created_at: "2026-05-15T10:00:00.000Z",
  answers: null,
  ...over,
});

describe("<ResultsCharts>", () => {
  it("renders three chart cards when there is at least one respondent", () => {
    render(<ResultsCharts stats={stats()} rows={[row()]} />);
    expect(screen.getByTestId("results-charts-root")).toBeInTheDocument();
    expect(screen.getByTestId("results-chart-score")).toBeInTheDocument();
    expect(screen.getByTestId("results-chart-passfail")).toBeInTheDocument();
    expect(screen.getByTestId("results-chart-time")).toBeInTheDocument();
  });

  it("returns null when there are no respondents (empty-state delegated to the route)", () => {
    const { container } = render(<ResultsCharts stats={stats({ count: 0 })} rows={[]} />);
    // Empty render — container's only child should be nothing.
    expect(container.firstChild).toBeNull();
  });

  it("emits an sr-only summary of the pass/fail split so screen readers don't depend on the SVG", () => {
    render(<ResultsCharts stats={stats({ count: 10, pass_count: 6 })} rows={[row()]} />);
    const sr = screen.getByTestId("results-chart-passfail-sr");
    expect(sr).toHaveTextContent(/10/); // total
    expect(sr).toHaveTextContent(/6/); // pass
    expect(sr).toHaveTextContent(/4/); // fail (derived)
  });

  it("renders a visible pass/fail legend with the actual counts", () => {
    render(<ResultsCharts stats={stats({ count: 8, pass_count: 5 })} rows={[row()]} />);
    const legend = screen.getByTestId("results-chart-passfail-legend");
    expect(within(legend).getByText("5")).toBeInTheDocument();
    expect(within(legend).getByText("3")).toBeInTheDocument();
  });

  it("emits an sr-only summary for the score-distribution chart", () => {
    render(<ResultsCharts stats={stats({ histogram: [1, 2, 3, 4] })} rows={[row()]} />);
    const sr = screen.getByTestId("results-chart-score-sr");
    // All four bucket counts must appear so a screen reader gets the full picture.
    expect(sr).toHaveTextContent(/0–24/);
    expect(sr).toHaveTextContent(/75–100/);
    expect(sr).toHaveTextContent("1");
    expect(sr).toHaveTextContent("4");
  });
});
