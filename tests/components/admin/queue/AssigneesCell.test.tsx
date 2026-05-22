// E48-v3 PR-QUEUE-EXTEND — AssigneesCell unit tests.
//
// Covers the four rendering states (0 / 1 / 2-3 / 4+ assignees), the
// overflow chip math, the tooltip aria-label aggregation, and the
// deterministic colour mapping that ties the same user_id to the same
// swatch on every render.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AssigneesCell } from "@/components/admin/queue/AssigneesCell";
import { avatarSwatch, paletteIndexFor } from "@/lib/admin/avatar-palette";

const T = "11111111-1111-4000-8000-000000000001";

function make(n: number) {
  return Array.from({ length: n }).map((_, i) => ({
    user_id: `user-${i}`,
    email: `u${i}@example.com`,
    display_name: `User ${i}`,
  }));
}

describe("AssigneesCell (E48-v3)", () => {
  it("renders em-dash placeholder when there are zero assignees", () => {
    render(<AssigneesCell ticketId={T} assignees={[]} />);
    const cell = screen.getByTestId(`admin-tickets-row-assigned-${T}`);
    expect(cell.textContent).toBe("—");
    expect(cell.getAttribute("aria-label")).toBe("Bez priradenia");
  });

  it("renders a single avatar + truncated name when there is exactly one assignee", () => {
    render(<AssigneesCell ticketId={T} assignees={make(1)} />);
    const cell = screen.getByTestId(`admin-tickets-row-assigned-${T}`);
    expect(cell.textContent).toContain("User 0");
    expect(cell.getAttribute("title")).toBe("User 0");
    expect(screen.getByTestId("admin-tickets-row-assigned-avatar-user-0")).toBeInTheDocument();
  });

  it("truncates a long display name to 20 chars + ellipsis while keeping full name in title", () => {
    const longName = "Veľmi dlhé meno administrátora";
    render(
      <AssigneesCell
        ticketId={T}
        assignees={[{ user_id: "u", email: "u@x", display_name: longName }]}
      />,
    );
    const cell = screen.getByTestId(`admin-tickets-row-assigned-${T}`);
    expect(cell.getAttribute("title")).toBe(longName);
    expect(cell.textContent ?? "").toMatch(/…$/);
  });

  it("stacks 2 avatars with no overflow chip", () => {
    render(<AssigneesCell ticketId={T} assignees={make(2)} />);
    expect(screen.getByTestId("admin-tickets-row-assigned-avatar-user-0")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-row-assigned-avatar-user-1")).toBeInTheDocument();
    expect(
      screen.queryByTestId(`admin-tickets-row-assigned-overflow-${T}`),
    ).not.toBeInTheDocument();
  });

  it("stacks 3 avatars with no overflow chip (exact-fit boundary)", () => {
    render(<AssigneesCell ticketId={T} assignees={make(3)} />);
    expect(screen.getByTestId("admin-tickets-row-assigned-avatar-user-2")).toBeInTheDocument();
    expect(
      screen.queryByTestId(`admin-tickets-row-assigned-overflow-${T}`),
    ).not.toBeInTheDocument();
  });

  it("renders +N overflow chip when 4+ assignees, showing only first 3 avatars", () => {
    render(<AssigneesCell ticketId={T} assignees={make(5)} />);
    expect(screen.getByTestId("admin-tickets-row-assigned-avatar-user-0")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-row-assigned-avatar-user-1")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tickets-row-assigned-avatar-user-2")).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin-tickets-row-assigned-avatar-user-3"),
    ).not.toBeInTheDocument();
    const chip = screen.getByTestId(`admin-tickets-row-assigned-overflow-${T}`);
    expect(chip.textContent).toBe("+2");
  });

  it("aria-label on the stack lists every assignee name with the 'Pridelení:' prefix", () => {
    render(<AssigneesCell ticketId={T} assignees={make(4)} />);
    const cell = screen.getByTestId(`admin-tickets-row-assigned-${T}`);
    const label = cell.getAttribute("aria-label") ?? "";
    expect(label.startsWith("Pridelení:")).toBe(true);
    expect(label).toContain("User 0");
    expect(label).toContain("User 3");
  });

  it("avatar swatch is deterministic: same user_id always maps to the same palette index", () => {
    const idx1 = paletteIndexFor("stable-user-id");
    const idx2 = paletteIndexFor("stable-user-id");
    expect(idx1).toBe(idx2);
    const swatchA = avatarSwatch("stable-user-id");
    const swatchB = avatarSwatch("stable-user-id");
    expect(swatchA).toEqual(swatchB);
  });
});
