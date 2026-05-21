import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpcSpy = vi.fn();
const useParamsSpy = vi.fn(() => ({ id: "11111111-1111-4111-8111-111111111111" }));
const useSearchSpy = vi.fn(() => ({ token: "a".repeat(64) }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcSpy(...args),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a {...rest}>{children}</a>
  ),
  createLazyFileRoute: () => (cfg: unknown) => cfg,
  useParams: () => useParamsSpy(),
  useSearch: () => useSearchSpy(),
}));

import { Route as ViewRoute } from "@/routes/contact-form.ticket.$id.lazy";

const ViewPage = (ViewRoute as unknown as { component: () => JSX.Element }).component;

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  useParamsSpy.mockReturnValue({ id: "11111111-1111-4111-8111-111111111111" });
  useSearchSpy.mockReturnValue({ token: "a".repeat(64) });
});

describe("KontaktTicketViewPage", () => {
  it("shows the missing-token state when ?token is absent", async () => {
    useSearchSpy.mockReturnValueOnce({ token: undefined });
    renderWithClient(<ViewPage />);
    expect(await screen.findByTestId("kontakt-ticket-view-not-found")).toBeInTheDocument();
    expect(screen.getByText(/Chýba bezpečnostný token/)).toBeInTheDocument();
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("renders the thread when the RPC returns ticket + messages + attachments", async () => {
    rpcSpy.mockResolvedValueOnce({
      data: {
        ticket: {
          id: "11111111-1111-4111-8111-111111111111",
          subject: "Nedá sa otvoriť test",
          body: "Skúsil som niekoľkokrát, ale nič sa nestane.",
          category: "bug",
          status: "in_progress",
          created_at: "2026-05-20T10:00:00Z",
          submitter_email: "user@example.com",
          submitter_name: "Anna Nováková",
        },
        messages: [
          {
            id: "msg-1",
            created_at: "2026-05-20T11:00:00Z",
            author_kind: "admin",
            author_name: "Tím podpory",
            body: "Mohli by ste skúsiť obnoviť stránku?",
          },
        ],
        attachments: [
          {
            id: "att-1",
            filename: "screenshot.png",
            mime_type: "image/png",
            size_bytes: 51200,
            scan_status: "clean",
          },
        ],
      },
      error: null,
    });

    renderWithClient(<ViewPage />);

    await waitFor(() =>
      expect(screen.getByTestId("kontakt-ticket-view-subject")).toHaveTextContent(
        "Nedá sa otvoriť test",
      ),
    );
    expect(screen.getByTestId("kontakt-ticket-view-status")).toHaveTextContent("V riešení");
    expect(screen.getByTestId("kontakt-ticket-view-message-msg-1")).toHaveTextContent(
      "Mohli by ste skúsiť obnoviť stránku?",
    );
    expect(screen.getByTestId("kontakt-ticket-view-attachments")).toHaveTextContent(
      "screenshot.png",
    );
    expect(rpcSpy).toHaveBeenCalledWith("get_ticket_thread_for_view_token", {
      p_ticket_id: "11111111-1111-4111-8111-111111111111",
      p_view_token: "a".repeat(64),
      p_ip_country: null,
    });
  });

  it("shows the not-found state when the RPC returns null (expired/invalidated token)", async () => {
    rpcSpy.mockResolvedValueOnce({ data: null, error: null });
    renderWithClient(<ViewPage />);
    await waitFor(() =>
      expect(screen.getByTestId("kontakt-ticket-view-not-found")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Odkaz už nie je platný/)).toBeInTheDocument();
  });

  it("shows the not-found state when the RPC errors", async () => {
    rpcSpy.mockResolvedValueOnce({ data: null, error: { message: "rpc_fail" } });
    renderWithClient(<ViewPage />);
    await waitFor(() =>
      expect(screen.getByTestId("kontakt-ticket-view-not-found")).toBeInTheDocument(),
    );
  });

  it("does not render attachments section when none are returned", async () => {
    rpcSpy.mockResolvedValueOnce({
      data: {
        ticket: {
          id: "11111111-1111-4111-8111-111111111111",
          subject: "Otázka o fakturácii",
          body: "Kedy mi príde faktúra?",
          category: "billing",
          status: "new",
          created_at: "2026-05-20T10:00:00Z",
          submitter_email: "user@example.com",
          submitter_name: null,
        },
        messages: [],
        attachments: [],
      },
      error: null,
    });
    renderWithClient(<ViewPage />);
    await waitFor(() =>
      expect(screen.getByTestId("kontakt-ticket-view-subject")).toHaveTextContent(
        "Otázka o fakturácii",
      ),
    );
    expect(screen.queryByTestId("kontakt-ticket-view-attachments")).not.toBeInTheDocument();
  });
});
