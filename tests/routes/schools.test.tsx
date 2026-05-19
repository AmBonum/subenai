import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock router primitives — the page only uses Link for navigation, not
// loaders or matches.
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
      const { to: _to, ...domProps } = rest as { to?: string };
      return (
        <a href="#" {...(domProps as Record<string, unknown>)}>
          {children}
        </a>
      );
    },
  };
});

// Footer pulls in real ConsentProvider hooks via SponsorsManager — stub it
// out so this test doesn't need the world.
vi.mock("@/components/layout/Footer", () => ({
  Footer: () => null,
}));

import { Route } from "@/routes/schools";

describe("/schools — author guide page (E12.5)", () => {
  it("renders the 4 numbered steps + GDPR + FAQ headings", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByRole("heading", { name: /Pre školy, lektorov a HR/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 1: Vytvor test/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 2: Zapni edu mód/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 3: Pošli link/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 4: Pozri výsledky/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /GDPR/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Časté otázky/i })).toBeInTheDocument();
  });

  it('explains "kontrolór" / "sprostredkovateľ" roles so a reviewer with legal background can verify', () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByText(/ty kontrolór/i)).toBeInTheDocument();
    expect(screen.getByText(/sprostredkovateľ/i)).toBeInTheDocument();
    expect(screen.getAllByText(/12 mesiacov/i).length).toBeGreaterThan(0);
  });

  it("includes a copy-paste e-mail template for respondents", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByText(/Vzor e-mailu/i)).toBeInTheDocument();
    expect(screen.getByText(/{public_url}/)).toBeInTheDocument();
  });

  it("FAQ explicitly says no password reset", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(
      screen.getByText(/Heslo ukladáme len ako bcrypt hash, originál nemáme/i),
    ).toBeInTheDocument();
  });
});
