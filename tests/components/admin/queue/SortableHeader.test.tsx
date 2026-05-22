// E48-v3 PR-QUEUE-EXTEND — SortableHeader unit tests.
//
// Verifies the 3-cycle behaviour (asc → desc → none → asc), the
// aria-sort attribute propagation, the icon swap, and the
// onSortChange contract. The header is always rendered inside a
// <table><thead><tr>…</tr></thead></table> wrapper to keep React/JSX
// table-element validation happy.

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SortableHeader } from "@/components/admin/queue/SortableHeader";
import type { TicketSortState } from "@/lib/admin/queries-tickets";

function renderHeader(currentSort: TicketSortState | null, onSortChange = vi.fn()) {
  const result = render(
    <table>
      <thead>
        <tr>
          <SortableHeader
            column="status"
            label="Stav"
            currentSort={currentSort}
            onSortChange={onSortChange}
          />
        </tr>
      </thead>
    </table>,
  );
  return { ...result, onSortChange };
}

describe("SortableHeader (E48-v3)", () => {
  it("first click on an inactive header sorts ASC", () => {
    const { onSortChange } = renderHeader(null);
    fireEvent.click(screen.getByTestId("admin-tickets-sort-status"));
    expect(onSortChange).toHaveBeenCalledWith({ column: "status", direction: "asc" });
  });

  it("clicking an active ASC header flips it to DESC", () => {
    const { onSortChange } = renderHeader({ column: "status", direction: "asc" });
    fireEvent.click(screen.getByTestId("admin-tickets-sort-status"));
    expect(onSortChange).toHaveBeenCalledWith({ column: "status", direction: "desc" });
  });

  it("clicking an active DESC header clears the sort (3-cycle → none)", () => {
    const { onSortChange } = renderHeader({ column: "status", direction: "desc" });
    fireEvent.click(screen.getByTestId("admin-tickets-sort-status"));
    expect(onSortChange).toHaveBeenCalledWith(null);
  });

  it("aria-sort reflects state: none / ascending / descending", () => {
    const { rerender } = renderHeader(null);
    expect(screen.getByRole("columnheader").getAttribute("aria-sort")).toBe("none");
    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader
              column="status"
              label="Stav"
              currentSort={{ column: "status", direction: "asc" }}
              onSortChange={vi.fn()}
            />
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByRole("columnheader").getAttribute("aria-sort")).toBe("ascending");
    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader
              column="status"
              label="Stav"
              currentSort={{ column: "status", direction: "desc" }}
              onSortChange={vi.fn()}
            />
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByRole("columnheader").getAttribute("aria-sort")).toBe("descending");
  });

  it("active column shows a directional indicator (asc/desc), inactive shows unsorted icon at 40% opacity", () => {
    const { rerender } = renderHeader(null);
    let indicator = screen.getByTestId("admin-tickets-sort-indicator-status");
    expect(indicator.getAttribute("data-direction")).toBe("none");
    expect(indicator.getAttribute("class") ?? "").toContain("opacity-40");

    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader
              column="status"
              label="Stav"
              currentSort={{ column: "status", direction: "asc" }}
              onSortChange={vi.fn()}
            />
          </tr>
        </thead>
      </table>,
    );
    indicator = screen.getByTestId("admin-tickets-sort-indicator-status");
    expect(indicator.getAttribute("data-direction")).toBe("asc");
  });

  it("rendering a column that is not the active sort shows the unsorted icon (only one column highlights at a time)", () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              column="created_at"
              label="Vytvorené"
              currentSort={{ column: "status", direction: "asc" }}
              onSortChange={vi.fn()}
            />
          </tr>
        </thead>
      </table>,
    );
    const indicator = screen.getByTestId("admin-tickets-sort-indicator-created_at");
    expect(indicator.getAttribute("data-direction")).toBe("none");
  });
});
