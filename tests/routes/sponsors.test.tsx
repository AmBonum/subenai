import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
}));

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({ openPreferences: vi.fn(), record: null }),
}));

// Footer (rendered inside SponzoriView) fetches footer_sponsors from Supabase
// on mount. Provide a chainable mock that resolves to an empty list so the
// component tests can focus on the sponzori list logic.
vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = () => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    return builder;
  };
  return { supabase: { from: vi.fn(() => makeBuilder()) } };
});

import { SponzoriView, type PublicSponsor } from "@/routes/sponsors";
import { ROUTES } from "@/config/routes";

function makeSponsor(overrides: Partial<PublicSponsor> = {}): PublicSponsor {
  return {
    id: `sponsor-${Math.random().toString(36).slice(2, 8)}`,
    display_name: "Anna Testovacia",
    display_link: null,
    display_message: null,
    created_at: "2026-04-15T10:00:00Z",
    has_refund: false,
    ...overrides,
  };
}

describe("SponzoriView (/sponsors)", () => {
  it("renders the empty state with a CTA when no public sponsors exist", async () => {
    const fetchSponsors = vi.fn(async () => [] as PublicSponsor[]);
    render(<SponzoriView fetchSponsors={fetchSponsors} />);

    await waitFor(() => expect(screen.getByText(/Buď prvý/i)).toBeInTheDocument());
    const ctas = screen.getAllByRole("link", { name: /Podporiť projekt/i });
    expect(ctas.some((el) => el.getAttribute("data-to") === ROUTES.podpora)).toBe(true);
  });

  it("renders accordion items per sponsor with link + message in expanded panel", async () => {
    const fetchSponsors = vi.fn(async () => [
      makeSponsor({ display_name: "Anna" }),
      makeSponsor({
        display_name: "Bob",
        display_link: "https://example.test/bob",
        display_message: "Vďaka za projekt!",
      }),
    ]);

    render(<SponzoriView fetchSponsors={fetchSponsors} />);

    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // Radix marks accordion content as hidden when collapsed — expand Bob's row first.
    const bobTrigger = screen.getByRole("button", { name: /Bob/i });
    bobTrigger.click();
    expect(await screen.findByText(/Vďaka za projekt/i)).toBeInTheDocument();

    const bobLink = screen.getByRole("link", { name: /example\.test\/bob/i });
    expect(bobLink).toHaveAttribute("href", "https://example.test/bob");
    expect(bobLink).toHaveAttribute("target", "_blank");
    expect(bobLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links to /sponsors/all so the user can reach the filterable full list", async () => {
    const fetchSponsors = vi.fn(async () => [makeSponsor({ display_name: "Anna" })]);
    render(<SponzoriView fetchSponsors={fetchSponsors} />);
    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());
    const all = screen.getByRole("link", { name: /Celý zoznam s filtrami/i });
    expect(all).toHaveAttribute("data-to", ROUTES.sponzoriVsetci);
  });

  it("never exposes total_eur, stripe_customer_id or any payment amount", async () => {
    const fetchSponsors = vi.fn(async () => [makeSponsor({ display_name: "Anna" })]);
    render(<SponzoriView fetchSponsors={fetchSponsors} />);

    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(screen.queryByText(/EUR/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cus_/)).not.toBeInTheDocument();
    expect(screen.queryByText(/total_eur/i)).not.toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    const fetchSponsors = vi.fn(async () => {
      throw new Error("RLS denied");
    });
    render(<SponzoriView fetchSponsors={fetchSponsors} />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it('shows "Vrátené" badge + refund explainer on accordion expand for refunded sponsors', async () => {
    const fetchSponsors = vi.fn(async () => [
      makeSponsor({ display_name: "Daniela", has_refund: true, display_message: "Hej!" }),
    ]);
    render(<SponzoriView fetchSponsors={fetchSponsors} />);

    await waitFor(() => expect(screen.getByText("Daniela")).toBeInTheDocument());
    expect(screen.getByTestId("sponzori-refund-badge")).toHaveTextContent(/Vrátené/);

    // Strike-through is applied to the display_name span itself.
    const danielaSpan = screen.getByText("Daniela");
    expect(danielaSpan.className).toMatch(/line-through/);

    // Expand the accordion to verify the refund explainer is rendered above
    // the optional display message.
    screen.getByRole("button", { name: /Daniela/i }).click();
    expect(
      await screen.findByText(/Príspevok bol vrátený na žiadosť prispievateľa/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hej!/)).toBeInTheDocument();
  });

  it("does NOT show the refund badge for non-refunded sponsors", async () => {
    const fetchSponsors = vi.fn(async () => [
      makeSponsor({ display_name: "Eva", has_refund: false }),
    ]);
    render(<SponzoriView fetchSponsors={fetchSponsors} />);
    await waitFor(() => expect(screen.getByText("Eva")).toBeInTheDocument());
    expect(screen.queryByTestId("sponzori-refund-badge")).not.toBeInTheDocument();
  });

  it("includes the anonymity disclosure footnote with consent-revocation contact", async () => {
    const fetchSponsors = vi.fn(async () => [] as PublicSponsor[]);
    render(<SponzoriView fetchSponsors={fetchSponsors} />);
    await waitFor(() => expect(screen.getByText(/Buď prvý/i)).toBeInTheDocument());
    expect(screen.getByText(/anonymitu/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /subenai\.podpora@gmail\.com/i })).toBeInTheDocument();
  });
});
