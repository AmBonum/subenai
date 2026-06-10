import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mutateAnonymize = vi.fn();
const mutateHardDelete = vi.fn();
const mutateCancelPending = vi.fn();
const mutateRectify = vi.fn();

const baseDossier = {
  generated_at: "2026-05-21T12:00:00Z",
  subject: { user_id: "user-1", email: "test@example.com" },
  profile: {
    id: "user-1",
    email: "test@example.com",
    display_name: "Test User",
    avatar_initials: "TU",
    created_at: "2026-01-01T00:00:00Z",
  },
  profile_preferences: null,
  user_roles: [{ user_id: "user-1", role: "user", assigned_by: null }],
  dsr_requests: [],
  dpa_requests: [],
  pending_erasure: null as null | {
    user_id: string;
    strategy: string;
    execute_at: string;
    initiated_by: string;
    created_at: string;
  },
};

vi.mock("@/lib/admin/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/queries")>("@/lib/admin/queries");
  return {
    ...actual,
    useUserDossier: () => ({ data: baseDossier, isLoading: false, error: null }),
    useAnonymizeUser: () => ({ mutate: mutateAnonymize, isPending: false }),
    useEnqueueHardDelete: () => ({ mutate: mutateHardDelete, isPending: false }),
    useCancelPendingErasure: () => ({ mutate: mutateCancelPending, isPending: false }),
    useRectifyUserData: () => ({ mutate: mutateRectify, isPending: false }),
  };
});

import { UserDossier } from "@/components/admin/UserDossier";

beforeEach(() => {
  vi.clearAllMocks();
  baseDossier.pending_erasure = null;
  baseDossier.dsr_requests = [];
  baseDossier.dpa_requests = [];
});

describe("UserDossier", () => {
  it("renders header with profile info, user_id, and action toolbar", () => {
    render(<UserDossier userId="user-1" />);
    expect(screen.getByTestId("admin-user-dossier-header")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-dossier-header-name")).toHaveTextContent("Test User");
    expect(screen.getByTestId("admin-user-dossier-header-email")).toHaveTextContent(
      "test@example.com",
    );
    expect(screen.getByTestId("admin-user-dossier-export-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-dossier-anonymize-button")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-dossier-hard-delete-button")).toBeInTheDocument();
  });

  it("renders identity + governance sections (governance shows empty state when no requests)", () => {
    render(<UserDossier userId="user-1" />);
    expect(screen.getByTestId("admin-user-dossier-section-identity")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-dossier-section-governance")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-dossier-governance-empty")).toBeInTheDocument();
  });

  it("anonymize opens a destructive typed-confirm dialog and fires the mutation after the email matches", async () => {
    const user = userEvent.setup();
    render(<UserDossier userId="user-1" />);
    await user.click(screen.getByTestId("admin-user-dossier-anonymize-button"));
    const dialog = screen.getByTestId("app-shell-confirm-dialog-root");
    expect(dialog).toHaveAttribute("data-severity", "destructive");
    const confirm = screen.getByTestId("app-shell-confirm-dialog-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await user.type(screen.getByTestId("app-shell-confirm-dialog-typed-input"), "test@example.com");
    expect(confirm.disabled).toBe(false);
    await user.click(confirm);
    expect(mutateAnonymize).toHaveBeenCalledTimes(1);
    expect((mutateAnonymize.mock.calls[0][0] as { userId: string }).userId).toBe("user-1");
  });

  it("hard-delete confirm button stays disabled until the typed email matches", async () => {
    const user = userEvent.setup();
    render(<UserDossier userId="user-1" />);
    await user.click(screen.getByTestId("admin-user-dossier-hard-delete-button"));
    expect(screen.getByTestId("app-shell-confirm-dialog-root")).toHaveAttribute(
      "data-severity",
      "destructive",
    );
    const input = screen.getByTestId("app-shell-confirm-dialog-typed-input") as HTMLInputElement;
    const confirm = screen.getByTestId("app-shell-confirm-dialog-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await user.type(input, "wrong@example.com");
    expect(confirm.disabled).toBe(true);
    await user.clear(input);
    await user.type(input, "test@example.com");
    expect(confirm.disabled).toBe(false);
    await user.click(confirm);
    expect(mutateHardDelete).toHaveBeenCalledTimes(1);
    expect((mutateHardDelete.mock.calls[0][0] as { userId: string }).userId).toBe("user-1");
  });

  it("renders pending-erasure banner and cancel button when pending_erasure is set", async () => {
    baseDossier.pending_erasure = {
      user_id: "user-1",
      strategy: "hard_delete",
      execute_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      initiated_by: "admin-1",
      created_at: new Date().toISOString(),
    };
    const user = userEvent.setup();
    render(<UserDossier userId="user-1" />);
    expect(screen.getByTestId("admin-user-dossier-pending-banner")).toBeInTheDocument();
    // Anonymize + hard-delete buttons must be disabled while pending.
    expect(
      (screen.getByTestId("admin-user-dossier-anonymize-button") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("admin-user-dossier-hard-delete-button") as HTMLButtonElement).disabled,
    ).toBe(true);
    await user.click(screen.getByTestId("admin-user-dossier-cancel-pending-button"));
    expect(mutateCancelPending).toHaveBeenCalledTimes(1);
  });

  it("E46.6: pencil next to display_name opens the rectify dialog with current value", async () => {
    const user = userEvent.setup();
    render(<UserDossier userId="user-1" />);
    const pencil = screen.getByTestId("admin-user-dossier-rectify-display-name");
    expect(pencil).toBeInTheDocument();
    await user.click(pencil);
    const dialog = await screen.findByTestId("admin-user-dossier-rectify-dialog");
    expect(dialog).toBeInTheDocument();
    const input = screen.getByTestId("admin-user-dossier-rectify-input") as HTMLInputElement;
    expect(input.value).toBe("Test User");
  });

  it("E46.6: confirm fires useRectifyUserData with profiles.display_name and the new value", async () => {
    const user = userEvent.setup();
    render(<UserDossier userId="user-1" />);
    await user.click(screen.getByTestId("admin-user-dossier-rectify-display-name"));
    const input = screen.getByTestId("admin-user-dossier-rectify-input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Corrected Name");
    await user.click(screen.getByTestId("admin-user-dossier-rectify-confirm"));
    expect(mutateRectify).toHaveBeenCalledTimes(1);
    const callArg = mutateRectify.mock.calls[0][0] as {
      userId: string;
      table: string;
      column: string;
      newValue: string;
    };
    expect(callArg.userId).toBe("user-1");
    expect(callArg.table).toBe("profiles");
    expect(callArg.column).toBe("display_name");
    expect(callArg.newValue).toBe("Corrected Name");
  });

  it("E46.6: confirm button stays disabled when input is empty or unchanged", async () => {
    const user = userEvent.setup();
    render(<UserDossier userId="user-1" />);
    await user.click(screen.getByTestId("admin-user-dossier-rectify-display-name"));
    const confirm = screen.getByTestId("admin-user-dossier-rectify-confirm") as HTMLButtonElement;
    // Pre-filled with current value → unchanged → disabled.
    expect(confirm.disabled).toBe(true);
    const input = screen.getByTestId("admin-user-dossier-rectify-input") as HTMLInputElement;
    await user.clear(input);
    // Empty → still disabled.
    expect(confirm.disabled).toBe(true);
    await user.type(input, "Something different");
    // Now changed → enabled.
    expect(confirm.disabled).toBe(false);
  });

  it("export button downloads a JSON blob with the dossier payload", async () => {
    const createObjectURLSpy = vi.fn(() => "blob:mock");
    const revokeSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeSpy as unknown as typeof URL.revokeObjectURL;
    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = clickSpy;

    const user = userEvent.setup();
    render(<UserDossier userId="user-1" />);
    await user.click(screen.getByTestId("admin-user-dossier-export-button"));
    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
  });
});
