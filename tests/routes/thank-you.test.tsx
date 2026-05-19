import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  createFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
  useParams: () => ({ sessionId: "cs_test_session_id" }),
}));

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({ openPreferences: vi.fn(), record: null }),
}));

import { ThankYouView } from "@/routes/thank-you.$sessionId";

const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...originalLocation, href: "" },
  });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  vi.restoreAllMocks();
});

function mockStatusOnce(payload: unknown, init: { status?: number } = {}) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status: init.status ?? 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("ThankYouView (/thank-you/$sessionId)", () => {
  it("renders donation summary + invoice link when status=ready", async () => {
    mockStatusOnce({
      status: "ready",
      is_subscription: false,
      donation: {
        amount_eur: 25,
        currency: "EUR",
        kind: "oneoff",
        created_at: "2026-04-27T12:00:00Z",
        invoice_pdf_url: "https://stripe.example/invoice.pdf",
      },
      sponsor_display_name: "Anna",
    });

    render(<ThankYouView sessionId="cs_test_session_id" />);

    await waitFor(() => expect(screen.getByText(/Ďakujeme, Anna/i)).toBeInTheDocument());
    expect(screen.getByText(/Jednorazová podpora/i)).toBeInTheDocument();
    expect(screen.getByText(/25\.00 EUR/i)).toBeInTheDocument();
    const invoiceLink = screen.getByRole("link", { name: /Stiahnuť faktúru/i });
    expect(invoiceLink).toHaveAttribute("href", "https://stripe.example/invoice.pdf");
    expect(invoiceLink).toHaveAttribute("target", "_blank");
  });

  it("greets generically when sponsor opted out of public listing", async () => {
    mockStatusOnce({
      status: "ready",
      is_subscription: false,
      donation: {
        amount_eur: 10,
        currency: "EUR",
        kind: "oneoff",
        created_at: "2026-04-27T12:00:00Z",
        invoice_pdf_url: null,
      },
      sponsor_display_name: null,
    });

    render(<ThankYouView sessionId="cs_test_session_id" />);
    await waitFor(() => expect(screen.getByText(/Ďakujeme za podporu/i)).toBeInTheDocument());
    expect(screen.queryByText(/Ďakujeme, /i)).not.toBeInTheDocument();
  });

  it("shows subscription manage block + portal redirect for monthly mode", async () => {
    mockStatusOnce({
      status: "ready",
      is_subscription: true,
      donation: {
        amount_eur: 10,
        currency: "EUR",
        kind: "subscription_invoice",
        created_at: "2026-04-27T12:00:00Z",
        invoice_pdf_url: "https://stripe.example/sub-invoice.pdf",
      },
      sponsor_display_name: null,
    });

    render(<ThankYouView sessionId="cs_test_session_id" />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Spravovať mesačný odber/i })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/Mesačný odber/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/10\.00 EUR\/mes/i)).toBeInTheDocument();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://billing.stripe.com/p/session/test" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Spravovať odber/i }));
    await waitFor(() =>
      expect(window.location.href).toBe("https://billing.stripe.com/p/session/test"),
    );
  });

  it("polls when status=pending then transitions to ready", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "pending", is_subscription: false, has_customer: true }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "ready",
            is_subscription: false,
            donation: {
              amount_eur: 5,
              currency: "EUR",
              kind: "oneoff",
              created_at: "2026-04-27T12:00:00Z",
              invoice_pdf_url: null,
            },
            sponsor_display_name: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    render(<ThankYouView sessionId="cs_test_session_id" />);
    await waitFor(() => expect(screen.getByText(/Hľadáme tvoju platbu/i)).toBeInTheDocument());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2), { timeout: 6000 });
    await waitFor(() => expect(screen.getByText(/Ďakujeme za podporu/i)).toBeInTheDocument());
  }, 10000);

  it("shows not_found state when API returns 404", async () => {
    mockStatusOnce({ status: "not_found" }, { status: 404 });
    render(<ThankYouView sessionId="cs_unknown" />);
    await waitFor(() => expect(screen.getByText(/Neznáma platba/i)).toBeInTheDocument());
  });

  it("shows unpaid state when payment did not complete", async () => {
    mockStatusOnce({ status: "unpaid", is_subscription: false, has_customer: false });
    render(<ThankYouView sessionId="cs_test_session_id" />);
    await waitFor(() => expect(screen.getByText(/Platba ešte neprešla/i)).toBeInTheDocument());
  });
});
