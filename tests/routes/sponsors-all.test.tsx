import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

import { AllSponsorsView } from "@/routes/sponsors.all";
import { ROUTES } from "@/config/routes";
import type { PublicSponsor } from "@/routes/sponsors";

function makeSponsor(overrides: Partial<PublicSponsor>): PublicSponsor {
  return {
    id: `sponsor-${Math.random().toString(36).slice(2, 8)}`,
    display_name: "Anna",
    display_link: null,
    display_message: null,
    created_at: "2026-04-01T10:00:00Z",
    has_refund: false,
    ...overrides,
  };
}

const SAMPLE: PublicSponsor[] = [
  makeSponsor({ display_name: "Anna", created_at: "2026-04-01T10:00:00Z" }),
  makeSponsor({
    display_name: "Bob",
    display_message: "Vďaka za prácu",
    created_at: "2025-09-12T10:00:00Z",
  }),
  makeSponsor({ display_name: "Cyril", created_at: "2025-03-20T10:00:00Z" }),
];

describe("AllSponsorsView (/sponsors/all)", () => {
  it("renders every sponsor when no filter is active", async () => {
    render(<AllSponsorsView fetchSponsors={async () => SAMPLE} />);
    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cyril")).toBeInTheDocument();
  });

  it("filters by name search across name and message", async () => {
    render(<AllSponsorsView fetchSponsors={async () => SAMPLE} />);
    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Hľadať v mene/i), { target: { value: "Bob" } });
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
    expect(screen.queryByText("Cyril")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Hľadať v mene/i), { target: { value: "vďaka" } });
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("filters by date range (inclusive bounds, local timezone)", async () => {
    render(<AllSponsorsView fetchSponsors={async () => SAMPLE} />);
    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());

    // From 2025-06-01 keeps Bob (Sep 2025) + Anna (Apr 2026), drops Cyril (Mar 2025).
    fireEvent.change(screen.getByLabelText(/Od dátumu/i), { target: { value: "2025-06-01" } });
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Cyril")).not.toBeInTheDocument();

    // Add To 2025-12-31 narrows further: only Bob.
    fireEvent.change(screen.getByLabelText(/Do dátumu/i), { target: { value: "2025-12-31" } });
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Cyril")).not.toBeInTheDocument();
  });

  it('filters by status: "Vrátené" only refunded, "Prijaté" only non-refunded', async () => {
    const mixed: PublicSponsor[] = [
      makeSponsor({ display_name: "Anna", has_refund: false }),
      makeSponsor({ display_name: "Daniela", has_refund: true }),
      makeSponsor({ display_name: "Eva", has_refund: false }),
    ];
    render(<AllSponsorsView fetchSponsors={async () => mixed} />);
    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Stav/i), { target: { value: "refunded" } });
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
    expect(screen.getByText("Daniela")).toBeInTheDocument();
    expect(screen.queryByText("Eva")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Stav/i), { target: { value: "accepted" } });
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText("Daniela")).not.toBeInTheDocument();
    expect(screen.getByText("Eva")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Stav/i), { target: { value: "all" } });
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Daniela")).toBeInTheDocument();
    expect(screen.getByText("Eva")).toBeInTheDocument();
  });

  it("shows the empty-filter state when nothing matches", async () => {
    render(<AllSponsorsView fetchSponsors={async () => SAMPLE} />);
    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Hľadať v mene/i), {
      target: { value: "nikto-takyto-tu-neni" },
    });
    expect(screen.getByText(/Nič nezodpovedá filtru/i)).toBeInTheDocument();
  });

  it('shows "Vrátené" badge + explainer for refunded sponsors, omits it for the rest', async () => {
    const withRefund: PublicSponsor[] = [
      makeSponsor({ display_name: "Anna", has_refund: false }),
      makeSponsor({ display_name: "Daniela", has_refund: true }),
    ];
    render(<AllSponsorsView fetchSponsors={async () => withRefund} />);

    await waitFor(() => expect(screen.getByText("Daniela")).toBeInTheDocument());
    const badges = screen.getAllByTestId("sponzori-vsetci-refund-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent(/Vrátené/);
    expect(screen.getByText(/Príspevok bol vrátený na žiadosť prispievateľa/i)).toBeInTheDocument();

    // Strike-through is applied to the refunded sponsor's heading.
    const danielaHeading = screen.getByText("Daniela").closest("h2");
    expect(danielaHeading?.className).toMatch(/line-through/);
  });

  it("renders the back link to /sponsors", async () => {
    render(<AllSponsorsView fetchSponsors={async () => SAMPLE} />);
    await waitFor(() => expect(screen.getByText("Anna")).toBeInTheDocument());
    const back = screen.getByRole("link", { name: /Späť na najnovších sponzorov/i });
    expect(back).toHaveAttribute("data-to", ROUTES.sponzori);
  });
});
