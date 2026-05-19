import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
    useLocation: () => ({ pathname: "/app/legal/dsr" }),
  };
});

import { Route } from "@/routes/app.legal.dsr";
import { adminMockRecorded, resetAdminMockRecorded } from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/legal/dsr", () => {
  it("renders title, form fields and submit button", () => {
    render(<Page />);
    expect(screen.getByTestId("app-legal-dsr-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-legal-dsr-title")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-subject-input")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-details-textarea")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-submit-button")).toBeInTheDocument();
  });

  it("submitting without a valid e-mail shows the error banner", () => {
    render(<Page />);
    fireEvent.click(screen.getByTestId("dsr-form-submit-button"));
    expect(screen.getByTestId("dsr-form-error-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("dsr-form-success-banner")).toBeNull();
  });

  it("submitting with a valid e-mail shows success banner and appends to history", async () => {
    render(<Page />);
    const email = screen.getByTestId("dsr-form-subject-input") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "test-user-7-1@example.sk" } });
    fireEvent.click(screen.getByTestId("dsr-form-submit-button"));
    const banner = await screen.findByTestId("dsr-form-success-banner");
    expect(banner).toBeInTheDocument();
    const history = screen.getByTestId("app-legal-dsr-history-card");
    expect(await within(history).findByText(/test-user-7-1@example.sk/)).toBeInTheDocument();
  });

  // Phase 9e — GDPR matrix: educator-submitted DSR must hit `dsr_requests`
  // with the exact body shape the legal team expects. The insert is what
  // creates the SLA clock; any drift in column names or status defaults
  // would leak into the admin queue with the wrong colour.
  it("submitting a DSR insert hits dsr_requests with requester_email, type, status=open and a +30d sla_due_at", async () => {
    resetAdminMockRecorded();
    render(<Page />);
    const email = screen.getByTestId("dsr-form-subject-input") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "gdpr-subject-9e@example.sk" } });
    const note = screen.getByTestId("dsr-form-details-textarea") as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "Please erase my data." } });

    const before = Date.now();
    fireEvent.click(screen.getByTestId("dsr-form-submit-button"));

    await waitFor(() => {
      const inserts = adminMockRecorded.inserts.filter((i) => i.table === "dsr_requests");
      expect(inserts.length).toBe(1);
    });

    const inserts = adminMockRecorded.inserts.filter((i) => i.table === "dsr_requests");
    const row = inserts[0].values as Record<string, unknown>;
    expect(row.requester_email).toBe("gdpr-subject-9e@example.sk");
    expect(row.type).toBe("access"); // default selection in the form
    expect(row.status).toBe("open");
    expect(row.note).toBe("Please erase my data.");
    // sla_due_at = now + 30 days. Allow a 2-minute slop for flake.
    const dueMs = new Date(row.sla_due_at as string).getTime();
    const expected = before + 30 * 86_400_000;
    expect(Math.abs(dueMs - expected)).toBeLessThan(120_000);
  });
});
