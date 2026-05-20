import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Stub the router Link so the table renders outside a router. The
// `to`/`params` props are reflected as href so we can assert the
// destination without booting TanStack Router in jsdom.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: React.ReactNode;
    to?: string;
    params?: Record<string, string>;
  } & Record<string, unknown>) => {
    const href = to ? to.replace(/\$(\w+)/g, (_m, k) => params?.[k] ?? `$${k}`) : "#";
    return (
      <a href={href} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    );
  },
}));

import { RespondentsTable } from "@/components/composer/edu/dashboard/RespondentsTable";
import type { RespondentRow } from "@/lib/edu/types";

const makeRow = (over: Partial<RespondentRow> = {}): RespondentRow => ({
  id: "att-1",
  share_id: "AAAAAAAA",
  respondent_name: "Jana Nováková",
  respondent_email: "jana@x.sk",
  final_score: 80,
  percentile: 75,
  total_time_ms: 12000,
  created_at: "2026-05-02T08:00:00.000Z",
  // E34 Phase 1 — `answers` is part of the contract now. Default to `null`
  // (historical-row fallback) unless a TC overrides; the drill-down modal
  // renders its "fallback_no_answers" copy when null.
  answers: null,
  ...over,
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RespondentsTable", () => {
  it('renders one row per respondent with score + "áno"/"nie" badge', () => {
    render(
      <RespondentsTable
        rows={[
          makeRow({ id: "1", respondent_name: "Anna", final_score: 90 }),
          makeRow({ id: "2", respondent_name: "Boris", final_score: 50 }),
        ]}
        passingThreshold={70}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Boris")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    const annaRow = screen.getByText("Anna").closest("tr");
    expect(annaRow).toBeTruthy();
    expect(within(annaRow as HTMLElement).getByText("áno")).toBeInTheDocument();
    const borisRow = screen.getByText("Boris").closest("tr");
    expect(within(borisRow as HTMLElement).getByText("nie")).toBeInTheDocument();
  });

  it("filters rows by name OR email when typing in search", async () => {
    const user = userEvent.setup();
    render(
      <RespondentsTable
        rows={[
          makeRow({ id: "1", respondent_name: "Anna", respondent_email: "anna@x.sk" }),
          makeRow({ id: "2", respondent_name: "Boris", respondent_email: "boris@y.sk" }),
        ]}
        passingThreshold={70}
        onDelete={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/Filtrovať respondentov/i), "Bor");
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
    expect(screen.getByText("Boris")).toBeInTheDocument();
  });

  it('toggles aria-sort on the "Skóre" header when clicked', async () => {
    const user = userEvent.setup();
    render(
      <RespondentsTable
        rows={[makeRow({ id: "1" }), makeRow({ id: "2", final_score: 30 })]}
        passingThreshold={70}
        onDelete={vi.fn()}
      />,
    );
    const skoreTh = screen.getByRole("columnheader", { name: /Skóre/i });
    expect(skoreTh.getAttribute("aria-sort")).toBe("none");
    await user.click(within(skoreTh).getByRole("button"));
    expect(skoreTh.getAttribute("aria-sort")).toBe("descending");
    await user.click(within(skoreTh).getByRole("button"));
    expect(skoreTh.getAttribute("aria-sort")).toBe("ascending");
  });

  it("D8 — sort choice persists across filter changes (no reset on search type)", async () => {
    const user = userEvent.setup();
    render(
      <RespondentsTable
        rows={[
          makeRow({ id: "1", respondent_name: "Anna", final_score: 90 }),
          makeRow({ id: "2", respondent_name: "Boris", final_score: 30 }),
          makeRow({ id: "3", respondent_name: "Cira", final_score: 60 }),
        ]}
        passingThreshold={70}
        onDelete={vi.fn()}
      />,
    );
    // Set sort to Skóre · ascending (click twice — first goes desc, second asc).
    const skoreTh = screen.getByRole("columnheader", { name: /Skóre/i });
    await user.click(within(skoreTh).getByRole("button"));
    await user.click(within(skoreTh).getByRole("button"));
    expect(skoreTh.getAttribute("aria-sort")).toBe("ascending");

    // Typing in the filter must NOT reset the sort choice — this is the
    // "React paper-cut" guard. If sort state ever gets lifted to a parent
    // that re-mounts on filter, this test catches the regression.
    await user.type(screen.getByLabelText(/Filtrovať respondentov/i), "a");
    expect(skoreTh.getAttribute("aria-sort")).toBe("ascending");

    // And clearing the filter back to "" also preserves the choice.
    await user.clear(screen.getByLabelText(/Filtrovať respondentov/i));
    expect(skoreTh.getAttribute("aria-sort")).toBe("ascending");
  });

  it("opens the designed confirm dialog on delete click; cancelling does NOT call onDelete", async () => {
    const onDelete = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <RespondentsTable
        rows={[makeRow({ id: "att-99", respondent_name: "Cira" })]}
        passingThreshold={70}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Zmazať respondenta Cira/i }));
    // Designed dialog mounts via Radix Portal — body text identifies it
    // unambiguously (name + email of the targeted respondent).
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    expect(within(dialog).getByTestId("app-shell-confirm-dialog-title")).toHaveTextContent(
      /vymazať respondenta/i,
    );
    expect(within(dialog).getByTestId("app-shell-confirm-dialog-description")).toHaveTextContent(
      /Cira/,
    );
    // Cancel — close the dialog, no destructive call.
    await user.click(within(dialog).getByTestId("app-shell-confirm-dialog-cancel"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onDelete with the row id when the confirm button is pressed", async () => {
    const onDelete = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <RespondentsTable
        rows={[makeRow({ id: "att-99", respondent_name: "Cira" })]}
        passingThreshold={70}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Zmazať respondenta Cira/i }));
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    await user.click(within(dialog).getByTestId("app-shell-confirm-dialog-confirm"));
    expect(onDelete).toHaveBeenCalledWith("att-99");
  });

  it("shows empty state when zero rows", () => {
    render(<RespondentsTable rows={[]} passingThreshold={70} onDelete={vi.fn()} />);
    expect(screen.getByText(/Zatiaľ žiadne odpovede/i)).toBeInTheDocument();
  });

  // E38 Phase B — Detail link points at the drill-down sub-route.
  it("renders a Detail link per row that points at /test/builder/$id/results/$attemptId when setId is provided", () => {
    render(
      <RespondentsTable
        rows={[makeRow({ id: "x1" }), makeRow({ id: "x2", respondent_name: "Other" })]}
        passingThreshold={70}
        onDelete={vi.fn()}
        setId="set-abc"
      />,
    );
    const link1 = screen.getByTestId("resp-table-detail-btn-x1");
    const link2 = screen.getByTestId("resp-table-detail-btn-x2");
    expect(link1.tagName).toBe("A");
    expect(link1.getAttribute("href")).toBe("/test/builder/set-abc/results/x1");
    expect(link2.getAttribute("href")).toBe("/test/builder/set-abc/results/x2");
    // Both rows still have the delete trash — Detail is a sibling, not a replacement.
    expect(screen.getByTestId("resp-table-delete-btn-x1")).toBeInTheDocument();
  });

  it("omits the Detail link when setId is not provided (legacy harness fallback)", () => {
    render(
      <RespondentsTable rows={[makeRow({ id: "x1" })]} passingThreshold={70} onDelete={vi.fn()} />,
    );
    expect(screen.queryByTestId("resp-table-detail-btn-x1")).toBeNull();
    // Trash still renders — Detail/Delete are independent affordances.
    expect(screen.getByTestId("resp-table-delete-btn-x1")).toBeInTheDocument();
  });

  // E38 Phase D — filter panel: pass/fail, score range, date range,
  // active-count chip + Clear. These tests run in uncontrolled mode
  // (no `filters` prop) so the internal-state fallback is exercised;
  // a separate controlled-mode test below verifies the parent gets
  // the onFiltersChange callback.
  describe("E38 Phase D — filterable table (uncontrolled)", () => {
    function openFilters(user: ReturnType<typeof userEvent.setup>) {
      return user.click(screen.getByTestId("resp-table-filters-toggle"));
    }

    it("narrows rows to passing respondents when 'Iba vyhoveli' is selected", async () => {
      const user = userEvent.setup();
      render(
        <RespondentsTable
          rows={[
            makeRow({ id: "1", respondent_name: "Pass-Person", final_score: 90 }),
            makeRow({ id: "2", respondent_name: "Fail-Person", final_score: 30 }),
          ]}
          passingThreshold={70}
          onDelete={vi.fn()}
        />,
      );
      await openFilters(user);
      await user.click(screen.getByTestId("resp-table-filter-pass-yes"));
      expect(screen.getByText("Pass-Person")).toBeInTheDocument();
      expect(screen.queryByText("Fail-Person")).not.toBeInTheDocument();
      // Active-count chip surfaces the narrowing — author sees what's
      // hidden from them without having to scan the filter inputs.
      expect(screen.getByTestId("resp-table-filter-active-chip")).toHaveTextContent("1");
    });

    it("narrows rows to failing respondents when 'Iba nevyhoveli' is selected", async () => {
      const user = userEvent.setup();
      render(
        <RespondentsTable
          rows={[
            makeRow({ id: "1", respondent_name: "Pass-Person", final_score: 90 }),
            makeRow({ id: "2", respondent_name: "Fail-Person", final_score: 30 }),
          ]}
          passingThreshold={70}
          onDelete={vi.fn()}
        />,
      );
      await openFilters(user);
      await user.click(screen.getByTestId("resp-table-filter-pass-no"));
      expect(screen.queryByText("Pass-Person")).not.toBeInTheDocument();
      expect(screen.getByText("Fail-Person")).toBeInTheDocument();
    });

    it("filters by inclusive score min/max range", async () => {
      const user = userEvent.setup();
      render(
        <RespondentsTable
          rows={[
            makeRow({ id: "1", respondent_name: "Alpha", final_score: 20 }),
            makeRow({ id: "2", respondent_name: "Beta", final_score: 50 }),
            makeRow({ id: "3", respondent_name: "Gamma", final_score: 80 }),
          ]}
          passingThreshold={70}
          onDelete={vi.fn()}
        />,
      );
      await openFilters(user);
      // Range [40, 70] — only Beta (50) qualifies; 20 and 80 fall outside.
      await user.type(screen.getByTestId("resp-table-filter-score-min"), "40");
      await user.type(screen.getByTestId("resp-table-filter-score-max"), "70");
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
      expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
      // Two axes constrained → two active filters in the chip.
      expect(screen.getByTestId("resp-table-filter-active-chip")).toHaveTextContent("2");
    });

    it("filters by inclusive date range (end-of-day on dateTo)", async () => {
      const user = userEvent.setup();
      render(
        <RespondentsTable
          rows={[
            makeRow({ id: "1", respondent_name: "EarlyBird", created_at: "2026-05-01T08:00:00Z" }),
            // The 02 row sits exactly at the dateTo boundary; end-of-day
            // inclusive semantics keep it visible.
            makeRow({ id: "2", respondent_name: "Borderline", created_at: "2026-05-02T22:00:00Z" }),
            makeRow({ id: "3", respondent_name: "LateBird", created_at: "2026-05-10T08:00:00Z" }),
          ]}
          passingThreshold={70}
          onDelete={vi.fn()}
        />,
      );
      await openFilters(user);
      // Inclusive lower bound — 02 still in range; 10 falls outside the upper bound.
      const dateFrom = screen.getByTestId("resp-table-filter-date-from") as HTMLInputElement;
      const dateTo = screen.getByTestId("resp-table-filter-date-to") as HTMLInputElement;
      // jsdom's <input type="date"> rejects partial strings during user.type;
      // fireEvent.change is the canonical workaround.
      await user.click(dateFrom);
      // Use the native value setter directly to avoid the browser's
      // date-format guards while still triggering React's onChange.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(dateFrom, "2026-04-30");
      dateFrom.dispatchEvent(new Event("input", { bubbles: true }));
      setter.call(dateTo, "2026-05-02");
      dateTo.dispatchEvent(new Event("input", { bubbles: true }));

      expect(screen.getByText("EarlyBird")).toBeInTheDocument();
      expect(screen.getByText("Borderline")).toBeInTheDocument();
      expect(screen.queryByText("LateBird")).not.toBeInTheDocument();
    });

    it("Clear filters resets pass + score + date + free-text query in one click", async () => {
      const user = userEvent.setup();
      render(
        <RespondentsTable
          rows={[
            makeRow({ id: "1", respondent_name: "Pass-Person", final_score: 90 }),
            makeRow({ id: "2", respondent_name: "Fail-Person", final_score: 30 }),
          ]}
          passingThreshold={70}
          onDelete={vi.fn()}
        />,
      );
      // Apply two narrowings: free-text query + a pass filter.
      await user.type(screen.getByLabelText(/Filtrovať respondentov/i), "Person");
      await openFilters(user);
      await user.click(screen.getByTestId("resp-table-filter-pass-yes"));
      expect(screen.getByTestId("resp-table-filter-active-chip")).toBeInTheDocument();
      // Single Clear button wipes both: structural filters AND query.
      await user.click(screen.getByTestId("resp-table-filter-clear"));
      expect(screen.queryByTestId("resp-table-filter-active-chip")).toBeNull();
      expect(screen.getByText("Pass-Person")).toBeInTheDocument();
      expect(screen.getByText("Fail-Person")).toBeInTheDocument();
      expect((screen.getByLabelText(/Filtrovať respondentov/i) as HTMLInputElement).value).toBe("");
    });

    it("renders the filter-specific empty state copy when filters hide every row", async () => {
      const user = userEvent.setup();
      render(
        <RespondentsTable
          rows={[makeRow({ id: "1", respondent_name: "Pass-Person", final_score: 90 })]}
          passingThreshold={70}
          onDelete={vi.fn()}
        />,
      );
      await openFilters(user);
      await user.click(screen.getByTestId("resp-table-filter-pass-no"));
      // No failing respondent → empty state surfaces the
      // filter-specific copy (distinct from the no-rows-yet copy so
      // the author knows what's happening).
      expect(screen.getByTestId("resp-table-empty")).toHaveTextContent(/nevyhovuje/i);
    });
  });

  describe("E38 Phase D — controlled filters", () => {
    it("calls onFiltersChange with the next state when the user toggles a filter", async () => {
      const onFiltersChange = vi.fn();
      const user = userEvent.setup();
      render(
        <RespondentsTable
          rows={[
            makeRow({ id: "1", respondent_name: "Pass-Person", final_score: 90 }),
            makeRow({ id: "2", respondent_name: "Fail-Person", final_score: 30 }),
          ]}
          passingThreshold={70}
          onDelete={vi.fn()}
          filters={{}}
          onFiltersChange={onFiltersChange}
        />,
      );
      // Panel is closed by default when no filter is active — open it.
      await user.click(screen.getByTestId("resp-table-filters-toggle"));
      await user.click(screen.getByTestId("resp-table-filter-pass-yes"));
      expect(onFiltersChange).toHaveBeenCalledWith({ pass: "yes" });
    });

    it("opens the filter panel automatically when controlled filters arrive with active state", () => {
      // A page that mounts with `?pass=yes` already in the URL should
      // surface the panel so the user can see what's narrowing the view.
      render(
        <RespondentsTable
          rows={[makeRow({ id: "1", respondent_name: "Pass-Person", final_score: 90 })]}
          passingThreshold={70}
          onDelete={vi.fn()}
          filters={{ pass: "yes" }}
          onFiltersChange={vi.fn()}
        />,
      );
      expect(screen.getByTestId("resp-table-filters-panel")).toBeInTheDocument();
      expect(screen.getByTestId("resp-table-filter-active-chip")).toHaveTextContent("1");
    });
  });
});
