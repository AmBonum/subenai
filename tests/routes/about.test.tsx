import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  useConsent: () => ({
    openPreferences: vi.fn(),
    record: null,
  }),
}));

import { AboutPage } from "@/routes/about";

describe("AboutPage (/about)", () => {
  it("renders the hero with project name and tagline", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1, name: /Čo je subenai/i })).toBeInTheDocument();
    // The same tagline appears in the footer brand block too — assert
    // both render rather than trying to scope to a specific section.
    expect(screen.getAllByText(/Bezplatný edukatívny nástroj/i).length).toBeGreaterThan(0);
  });

  it("includes the six required transparency sections", () => {
    render(<AboutPage />);
    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { name: /Cieľ projektu/i })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: /Prečo bezplatné/i })).toBeInTheDocument();
    expect(
      within(main).getByRole("heading", { name: /Prečo sponsorship a nie členstvo/i }),
    ).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: /Kam idú peniaze/i })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: /Čo sponzori dostanú/i })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: /Čo nerobíme/i })).toBeInTheDocument();
  });

  it("explicitly disclaims ads / paywall / dark patterns and gates tracking on explicit consent", () => {
    render(<AboutPage />);
    expect(screen.getByText(/Žiadne reklamy v obsahu/i)).toBeInTheDocument();
    expect(screen.getByText(/Žiadne tracking bez explicitného súhlasu/i)).toBeInTheDocument();
    expect(screen.getByText(/Žiadny paywall/i)).toBeInTheDocument();
    expect(screen.getByText(/Žiadne dark patterns/i)).toBeInTheDocument();
  });

  it("lists every required cost line in the breakdown", () => {
    render(<AboutPage />);
    const breakdown = screen.getByRole("heading", { name: /Kam idú peniaze/i }).closest("section");
    expect(breakdown).not.toBeNull();
    const inSection = within(breakdown as HTMLElement);
    expect(inSection.getByText(/Cloudflare hosting/i)).toBeInTheDocument();
    expect(inSection.getByText(/Supabase databáza/i)).toBeInTheDocument();
    expect(inSection.getByText(/Stripe poplatky/i)).toBeInTheDocument();
    expect(inSection.getByText(/Tvorba nového obsahu/i)).toBeInTheDocument();
    expect(inSection.getByText(/Audit a údržba/i)).toBeInTheDocument();
    expect(inSection.getByText(/expert konzultácie/i)).toBeInTheDocument();
  });

  it("provides a back-to-home link in the header", () => {
    render(<AboutPage />);
    const backLink = screen.getByRole("link", { name: /Späť na domov/i });
    expect(backLink).toHaveAttribute("data-to", "/");
  });
});
