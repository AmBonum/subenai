import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminPicker } from "@/components/admin/common/AdminPicker";

const { ADMINS } = vi.hoisted(() => ({
  ADMINS: [
    { user_id: "u1", email: "alice@test.sk", display_name: "Alice Admin" },
    { user_id: "u2", email: "bob@test.sk", display_name: "Bob Moderator" },
    { user_id: "u3", email: "carol@test.sk", display_name: "Carol Support" },
  ],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: ADMINS, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: () => {} } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

function renderPicker(
  props: Partial<Parameters<typeof AdminPicker>[0]> & { selectedAdminIds?: string[] } = {},
) {
  const onSelect = props.onSelect ?? vi.fn();
  return render(
    <AdminPicker
      trigger={<button>Prideliť admina</button>}
      selectedAdminIds={props.selectedAdminIds ?? []}
      onSelect={onSelect}
      {...props}
    />,
  );
}

describe("AdminPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all admins when popover is opened", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    await waitFor(() => {
      expect(screen.getByTestId("admin-ticket-assignment-option-u1")).toBeInTheDocument();
      expect(screen.getByTestId("admin-ticket-assignment-option-u2")).toBeInTheDocument();
      expect(screen.getByTestId("admin-ticket-assignment-option-u3")).toBeInTheDocument();
    });
  });

  it("filters list by case-insensitive search on display_name", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    const input = await screen.findByTestId("admin-ticket-assignment-search");
    fireEvent.change(input, { target: { value: "bob" } });
    await waitFor(() => {
      expect(screen.getByTestId("admin-ticket-assignment-option-u2")).toBeInTheDocument();
      expect(screen.queryByTestId("admin-ticket-assignment-option-u1")).not.toBeInTheDocument();
    });
  });

  it("filters list by case-insensitive search on email", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    const input = await screen.findByTestId("admin-ticket-assignment-search");
    fireEvent.change(input, { target: { value: "CAROL" } });
    await waitFor(() => {
      expect(screen.getByTestId("admin-ticket-assignment-option-u3")).toBeInTheDocument();
      expect(screen.queryByTestId("admin-ticket-assignment-option-u1")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when search has no results", async () => {
    renderPicker({ emptyLabel: "Žiadne výsledky" });
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    const input = await screen.findByTestId("admin-ticket-assignment-search");
    fireEvent.change(input, { target: { value: "zzznobody" } });
    await waitFor(() => {
      expect(screen.getByText("Žiadne výsledky")).toBeInTheDocument();
    });
  });

  it("shows check + pridelené label for already-selected admins", async () => {
    renderPicker({ selectedAdminIds: ["u2"] });
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    await waitFor(() => {
      const option = screen.getByTestId("admin-ticket-assignment-option-u2");
      expect(option).toBeInTheDocument();
      expect(option.textContent).toContain("pridelené");
    });
  });

  it("does not call onSelect when clicking an already-selected admin", async () => {
    const onSelect = vi.fn();
    renderPicker({ selectedAdminIds: ["u1"], onSelect });
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    const option = await screen.findByTestId("admin-ticket-assignment-option-u1");
    fireEvent.click(option);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("excludes admins in excludeIds from the list entirely", async () => {
    renderPicker({ excludeIds: ["u2"] });
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    await waitFor(() => {
      expect(screen.queryByTestId("admin-ticket-assignment-option-u2")).not.toBeInTheDocument();
      expect(screen.getByTestId("admin-ticket-assignment-option-u1")).toBeInTheDocument();
    });
  });

  it("calls onSelect with admin id and closes popover on click", async () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });
    fireEvent.click(screen.getByRole("button", { name: "Prideliť admina" }));
    const option = await screen.findByTestId("admin-ticket-assignment-option-u3");
    fireEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith("u3");
    await waitFor(() => {
      expect(screen.queryByTestId("admin-ticket-assignment-option-u1")).not.toBeInTheDocument();
    });
  });
});
