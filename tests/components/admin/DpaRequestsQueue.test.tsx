import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mutateUpdateStatus = vi.fn();
const mutateAnonymise = vi.fn();
const mutateResend = vi.fn();
const mutateDownload = vi.fn();

vi.mock("@/lib/admin/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/queries")>("@/lib/admin/queries");
  return {
    ...actual,
    useAdminDpaRequests: () => ({
      data: [
        {
          id: "row-1",
          created_at: "2026-05-20T10:00:00Z",
          contact_name: "Jana Nováková",
          contact_email: "jana@gymzlb.sk",
          school_name: "Gymnázium Zlatá brána",
          dpa_version: "v0.1",
          status: "pending" as const,
          email_status: "sent" as const,
          email_error: null,
          anonymized_at: null,
        },
        {
          id: "row-2",
          created_at: "2026-05-19T10:00:00Z",
          contact_name: "Peter Veľký",
          contact_email: "peter@stredna.sk",
          school_name: "Stredná škola Bratislava",
          dpa_version: "v0.1",
          status: "signed" as const,
          email_status: "failed" as const,
          email_error: "resend_403",
          anonymized_at: null,
        },
      ],
      isLoading: false,
      isError: false,
    }),
    useUpdateDpaRequestStatus: () => ({ mutate: mutateUpdateStatus, isPending: false }),
    useAnonymiseDpaRequest: () => ({ mutate: mutateAnonymise, isPending: false }),
    useResendDpaEmail: () => ({ mutate: mutateResend, isPending: false }),
    useDownloadDpaPdf: () => ({ mutate: mutateDownload, isPending: false }),
  };
});

import { DpaRequestsQueue } from "@/components/admin/DpaRequestsQueue";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DpaRequestsQueue", () => {
  it("renders both rows + their school + contact + version cells", () => {
    render(<DpaRequestsQueue />);
    expect(screen.getByTestId("dpa-queue-root")).toBeInTheDocument();
    expect(screen.getByTestId("dpa-queue-row-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("dpa-queue-row-row-2")).toBeInTheDocument();
    expect(screen.getByText("Gymnázium Zlatá brána")).toBeInTheDocument();
    expect(screen.getByText("jana@gymzlb.sk")).toBeInTheDocument();
    // failed e-mail surfaces the error code on the row
    expect(screen.getByText("resend_403")).toBeInTheDocument();
  });

  it("search filters rows by school name", async () => {
    const user = userEvent.setup();
    render(<DpaRequestsQueue />);
    await user.type(screen.getByTestId("dpa-queue-search"), "Stredná");
    await waitFor(() => {
      expect(screen.queryByTestId("dpa-queue-row-row-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("dpa-queue-row-row-2")).toBeInTheDocument();
    });
  });

  it("resend button fires useResendDpaEmail with the row", async () => {
    const user = userEvent.setup();
    render(<DpaRequestsQueue />);
    await user.click(screen.getByTestId("dpa-queue-resend-row-2"));
    expect(mutateResend).toHaveBeenCalledTimes(1);
    const callArg = mutateResend.mock.calls[0][0] as { row: { id: string } };
    expect(callArg.row.id).toBe("row-2");
  });

  it("download button fires useDownloadDpaPdf with the row (Art. 28(9) inspection trail)", async () => {
    const user = userEvent.setup();
    render(<DpaRequestsQueue />);
    await user.click(screen.getByTestId("dpa-queue-download-row-1"));
    expect(mutateDownload).toHaveBeenCalledTimes(1);
    const callArg = mutateDownload.mock.calls[0][0] as { row: { id: string } };
    expect(callArg.row.id).toBe("row-1");
  });

  it("anonymise button opens the destructive ConfirmDialog and fires the mutation on confirm", async () => {
    const user = userEvent.setup();
    render(<DpaRequestsQueue />);
    await user.click(screen.getByTestId("dpa-queue-anonymise-row-1"));
    // Senior modal rule (CLAUDE.md): NO window.confirm — the
    // severity-aware AlertDialog opens with `data-severity="destructive"`.
    const dialog = await screen.findByTestId("app-shell-confirm-dialog-root");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("data-severity")).toBe("destructive");
    expect(screen.getByTestId("app-shell-confirm-dialog-icon-destructive")).toBeInTheDocument();
    await user.click(screen.getByTestId("app-shell-confirm-dialog-confirm"));
    expect(mutateAnonymise).toHaveBeenCalledTimes(1);
    const callArg = mutateAnonymise.mock.calls[0][0] as { id: string };
    expect(callArg.id).toBe("row-1");
  });

  it("anonymise dialog Cancel button closes without firing the mutation", async () => {
    const user = userEvent.setup();
    render(<DpaRequestsQueue />);
    await user.click(screen.getByTestId("dpa-queue-anonymise-row-1"));
    await screen.findByTestId("app-shell-confirm-dialog-root");
    await user.click(screen.getByTestId("app-shell-confirm-dialog-cancel"));
    expect(mutateAnonymise).not.toHaveBeenCalled();
  });

  it("exposes the CSV export button (enabled when there's at least one filtered row)", () => {
    render(<DpaRequestsQueue />);
    const btn = screen.getByTestId("dpa-queue-export-csv");
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });
});
