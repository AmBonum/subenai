import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerState = vi.hoisted(() => ({
  search: {} as Record<string, unknown>,
  params: {} as Record<string, string>,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({
    ...opts,
    useSearch: () => routerState.search,
    useParams: () => routerState.params,
  }),
  Link: ({
    children,
    to,
    params,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    params?: Record<string, string>;
  }) => {
    let href = to ?? "";
    for (const [k, v] of Object.entries(params ?? {})) href = href.replace(`$${k}`, v);
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const billing = vi.hoisted(() => ({
  useOrgBilling: vi.fn(),
  callBillingApi: vi.fn(),
}));
vi.mock("@/lib/billing/client", () => ({
  ...billing,
  orgBillingQueryKey: ["billing", "org-subscription"],
}));

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

import { Route as PricingRoute } from "@/routes/cennik";
import { Route as BillingRoute } from "@/routes/app.billing";
import { Route as EvidenceRoute } from "@/routes/app.tests.$testId_.doklad";
import { Route as VerifyRoute } from "@/routes/overenie.$reportId";

// createFileRoute is mocked to return its options, so the route *is* { component }.
function componentOf(route: object): ComponentType {
  return (route as { component: ComponentType }).component;
}

function renderRoute(route: object) {
  const Component = componentOf(route);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<Component />, { wrapper });
}

const ACTIVE = {
  plan: "firma",
  status: "active",
  respondent_cap: 100,
  current_period_start: "2026-10-01T00:00:00Z",
  current_period_end: "2099-10-01T00:00:00Z",
  cancel_at_period_end: false,
};

const assign = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  routerState.search = {};
  routerState.params = {};
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign },
  });
});

describe("/cennik", () => {
  it("lists the free tier, three paid plans with server prices, and the custom tier", () => {
    renderRoute(PricingRoute);
    expect(screen.getByTestId("billing-plan-card-free")).toBeInTheDocument();
    expect(screen.getByTestId("billing-plan-card-start-price")).toHaveTextContent("149 €");
    expect(screen.getByTestId("billing-plan-card-firma-price")).toHaveTextContent("390 €");
    expect(screen.getByTestId("billing-plan-card-firma_plus-price")).toHaveTextContent("790 €");
    expect(screen.getByTestId("billing-plan-card-firma-badge")).toBeInTheDocument();
    expect(screen.getByTestId("billing-plan-card-firma-cta")).toHaveAttribute(
      "href",
      "/app/billing?plan=firma",
    );
    expect(screen.getByTestId("billing-plan-card-custom")).toBeInTheDocument();
    expect(screen.queryByTestId("pricing-checkout-cancelled")).not.toBeInTheDocument();
  });

  it("never claims NIS2 compliance", () => {
    const { container } = renderRoute(PricingRoute);
    expect(container.textContent).not.toMatch(/NIS2 compliant|certifikácia NIS2 je/i);
    expect(screen.getByTestId("pricing-faq-item-0")).toHaveTextContent("Nie.");
  });

  it("acknowledges a cancelled checkout", () => {
    routerState.search = { checkout: "cancelled" };
    renderRoute(PricingRoute);
    expect(screen.getByTestId("pricing-checkout-cancelled")).toHaveAttribute("role", "status");
  });
});

describe("/app/billing", () => {
  it("free account: both consents are required before the checkout call", async () => {
    billing.useOrgBilling.mockReturnValue({
      isPending: false,
      isError: false,
      data: { subscription: null, usedInPeriod: 0 },
    });
    billing.callBillingApi.mockResolvedValue({
      ok: true,
      data: { url: "https://checkout.stripe.com/x" },
    });
    routerState.search = { plan: "start" };
    const user = userEvent.setup();
    renderRoute(BillingRoute);

    await user.click(screen.getByTestId("billing-pay-button"));
    expect(screen.getByTestId("billing-checkout-error")).toHaveTextContent("súhlas");
    expect(billing.callBillingApi).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("billing-consent-terms"));
    await user.click(screen.getByTestId("billing-pay-button"));
    expect(screen.getByTestId("billing-checkout-error")).toHaveTextContent("okamžité");
    expect(billing.callBillingApi).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("billing-consent-immediate"));
    await user.click(screen.getByTestId("billing-pay-button"));
    await waitFor(() =>
      expect(billing.callBillingApi).toHaveBeenCalledWith("/api/billing/checkout", {
        plan: "start",
        consent_terms: true,
        consent_immediate: true,
      }),
    );
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/x");
  });

  it("shows the server error in words, not a code", async () => {
    billing.useOrgBilling.mockReturnValue({
      isPending: false,
      isError: false,
      data: { subscription: null, usedInPeriod: 0 },
    });
    billing.callBillingApi.mockResolvedValue({
      ok: false,
      status: 409,
      error: "already_subscribed",
      data: {},
    });
    routerState.search = { plan: "firma" };
    const user = userEvent.setup();
    renderRoute(BillingRoute);
    await user.click(screen.getByTestId("billing-consent-terms"));
    await user.click(screen.getByTestId("billing-consent-immediate"));
    await user.click(screen.getByTestId("billing-pay-button"));
    expect(await screen.findByTestId("billing-checkout-error")).toHaveTextContent(
      "Už máte aktívne predplatné",
    );
  });

  it("active plan: shows usage against the snapshot cap and the portal button", () => {
    billing.useOrgBilling.mockReturnValue({
      isPending: false,
      isError: false,
      data: { subscription: ACTIVE, usedInPeriod: 37 },
    });
    renderRoute(BillingRoute);
    expect(screen.getByTestId("billing-active-plan")).toHaveTextContent("Firma");
    expect(screen.getByTestId("billing-active-usage")).toHaveTextContent("37 z 100");
    expect(screen.getByTestId("billing-active-usage-bar")).toHaveAttribute("aria-valuenow", "37");
    expect(screen.getByTestId("billing-manage-button")).toBeInTheDocument();
    expect(screen.queryByTestId("billing-choose")).not.toBeInTheDocument();
  });

  it("after checkout: polls and announces activation", () => {
    routerState.search = { checkout: "success" };
    billing.useOrgBilling.mockReturnValue({
      isPending: false,
      isError: false,
      data: { subscription: null, usedInPeriod: 0 },
    });
    const { rerender } = renderRoute(BillingRoute);
    expect(billing.useOrgBilling).toHaveBeenCalledWith({ pollUntilActive: true });
    expect(screen.getByTestId("billing-success-pending")).toBeInTheDocument();

    billing.useOrgBilling.mockReturnValue({
      isPending: false,
      isError: false,
      data: { subscription: ACTIVE, usedInPeriod: 0 },
    });
    const Component = componentOf(BillingRoute);
    rerender(<Component />);
    expect(screen.getByTestId("billing-success-done")).toHaveTextContent("Firma");
  });

  it("load failure has its own state", () => {
    billing.useOrgBilling.mockReturnValue({ isPending: false, isError: true, data: undefined });
    renderRoute(BillingRoute);
    expect(screen.getByTestId("billing-load-error")).toHaveAttribute("role", "alert");
  });
});

describe("/app/tests/$testId/doklad", () => {
  const report = {
    id: "8f2c7a8e-0000-4000-8000-000000000001",
    orgName: "Firma s.r.o.",
    testTitle: "Falošná faktúra",
    testVersion: 2,
    generatedAt: "2026-10-12T10:00:00.000Z",
    passScore: 70,
    respondents: [
      {
        sessionId: "s1",
        name: "Jana",
        email: "",
        finishedAt: "2026-10-01T08:00:00Z",
        score: 90,
        passed: true,
      },
      {
        sessionId: "s2",
        name: "",
        email: "",
        finishedAt: "2026-10-02T08:00:00Z",
        score: 40,
        passed: false,
      },
    ],
    respondentCount: 2,
    passedCount: 1,
    averageScore: 65,
    sha256: "a".repeat(64),
  };

  async function submit(org = "Firma s.r.o.") {
    const user = userEvent.setup();
    routerState.params = { testId: "t1" };
    renderRoute(EvidenceRoute);
    await user.type(screen.getByTestId("evidence-org-input"), org);
    await user.click(screen.getByTestId("evidence-generate-button"));
  }

  it("issued: shows the table, verification link and download button", async () => {
    billing.callBillingApi.mockResolvedValue({
      ok: true,
      data: { report, allowance: { cap: 25, used: 2 } },
    });
    await submit();
    expect(billing.callBillingApi).toHaveBeenCalledWith("/api/billing/evidence", {
      testId: "t1",
      orgName: "Firma s.r.o.",
    });
    const issued = await screen.findByTestId("evidence-issued");
    expect(within(issued).getAllByTestId("evidence-table-row")).toHaveLength(2);
    expect(within(issued).getByText("Respondent č. 2")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-issued-message")).toHaveTextContent("2 z 25");
    expect(screen.getByTestId("evidence-verify")).toHaveTextContent(`/overenie/${report.id}`);
    expect(screen.getByTestId("evidence-download-button")).toBeEnabled();
  });

  it("free account: explains the plan and links to pricing", async () => {
    billing.callBillingApi.mockResolvedValue({
      ok: false,
      status: 402,
      error: "no_plan",
      data: {},
    });
    await submit();
    const notice = await screen.findByTestId("evidence-no-plan");
    expect(within(notice).getByRole("link")).toHaveAttribute("href", "/cennik");
  });

  it("cap exceeded: states the numbers", async () => {
    billing.callBillingApi.mockResolvedValue({
      ok: false,
      status: 402,
      error: "cap_exceeded",
      data: { cap: 25, used: 24, requested: 3 },
    });
    await submit();
    expect(await screen.findByTestId("evidence-cap-exceeded")).toHaveTextContent("3 nových");
  });

  it("nobody finished yet: empty state tells what to do", async () => {
    billing.callBillingApi.mockResolvedValue({
      ok: false,
      status: 422,
      error: "no_finished_sessions",
      data: {},
    });
    await submit();
    expect(await screen.findByTestId("evidence-empty")).toHaveTextContent("odkaz");
  });

  it("unknown errors fall back to a helpful message", async () => {
    billing.callBillingApi.mockResolvedValue({
      ok: false,
      status: 500,
      error: "persist_failed",
      data: {},
    });
    await submit();
    expect(await screen.findByTestId("evidence-error")).toHaveTextContent("Skúste to znova");
  });
});

describe("/overenie/$reportId", () => {
  it("a malformed id is rejected without querying", () => {
    routerState.params = { reportId: "nope" };
    renderRoute(VerifyRoute);
    expect(screen.getByTestId("verify-invalid")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a known report shows only the non-personal summary", async () => {
    routerState.params = { reportId: "8f2c7a8e-0000-4000-8000-000000000001" };
    rpc.mockResolvedValue({
      data: [
        {
          org_name: "Firma s.r.o.",
          test_title: "Falošná faktúra",
          test_version: 2,
          respondent_count: 12,
          passed_count: 10,
          content_sha256: "b".repeat(64),
          created_at: "2026-10-12T10:00:00Z",
        },
      ],
      error: null,
    });
    renderRoute(VerifyRoute);
    expect(await screen.findByTestId("verify-valid")).toBeInTheDocument();
    expect(screen.getByTestId("verify-org")).toHaveTextContent("Firma s.r.o.");
    expect(screen.getByTestId("verify-counts")).toHaveTextContent("12");
    expect(rpc).toHaveBeenCalledWith("verify_evidence_report", {
      p_id: "8f2c7a8e-0000-4000-8000-000000000001",
    });
  });

  it("an unknown report says so", async () => {
    routerState.params = { reportId: "8f2c7a8e-0000-4000-8000-000000000009" };
    rpc.mockResolvedValue({ data: [], error: null });
    renderRoute(VerifyRoute);
    expect(await screen.findByTestId("verify-invalid")).toBeInTheDocument();
  });
});
