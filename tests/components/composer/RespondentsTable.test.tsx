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
});
