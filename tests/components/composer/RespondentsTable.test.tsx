import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  // E34 Phase 1 — Detail button + drill-down modal integration.
  it("renders a Detail button per row (alongside the existing delete trash)", () => {
    render(
      <RespondentsTable
        rows={[makeRow({ id: "x1" }), makeRow({ id: "x2", respondent_name: "Other" })]}
        passingThreshold={70}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId("resp-table-detail-btn-x1")).toBeInTheDocument();
    expect(screen.getByTestId("resp-table-detail-btn-x2")).toBeInTheDocument();
    // Both rows still have the delete trash — Detail is additive, not a replacement.
    expect(screen.getByTestId("resp-table-delete-btn-x1")).toBeInTheDocument();
  });

  it("opens the drill-down modal on Detail click and renders the fallback when answers are null", async () => {
    const user = userEvent.setup();
    render(
      <RespondentsTable
        rows={[makeRow({ id: "x1", respondent_name: "Anna" })]}
        passingThreshold={70}
        onDelete={vi.fn()}
      />,
    );
    // Modal not in DOM until clicked.
    expect(screen.queryByTestId("respondent-detail-root")).toBeNull();

    await user.click(screen.getByTestId("resp-table-detail-btn-x1"));

    // Modal opens with the right respondent name in the header and the
    // "no answers" fallback because the seeded row has answers=null.
    const modal = await screen.findByTestId("respondent-detail-root");
    expect(within(modal).getByTestId("respondent-detail-heading").textContent).toContain("Anna");
    expect(within(modal).getByTestId("respondent-detail-fallback")).toBeInTheDocument();
  });
});
