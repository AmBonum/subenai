import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mutateUpdateStatus = vi.fn();
const mutateAnonymise = vi.fn();
const mutateResend = vi.fn();

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

  it("anonymise button requires confirm + fires the mutation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<DpaRequestsQueue />);
    await user.click(screen.getByTestId("dpa-queue-anonymise-row-1"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mutateAnonymise).toHaveBeenCalledTimes(1);
    const callArg = mutateAnonymise.mock.calls[0][0] as { id: string };
    expect(callArg.id).toBe("row-1");
  });

  it("anonymise button does NOT fire mutation when user cancels", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<DpaRequestsQueue />);
    await user.click(screen.getByTestId("dpa-queue-anonymise-row-1"));
    expect(mutateAnonymise).not.toHaveBeenCalled();
  });
});
