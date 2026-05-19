import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TestPackHeroFallback } from "@/components/test-packs/TestPackHeroFallback";

describe("TestPackHeroFallback — E25 Phase 1 industry-gradient hero", () => {
  it("renders the pack emoji as the centered pictogram", () => {
    render(
      <TestPackHeroFallback
        industry="eshop"
        emoji="🛒"
        title="E-shop pack"
        testid="fixture-hero"
      />,
    );
    expect(screen.getByTestId("fixture-hero")).toBeInTheDocument();
    expect(screen.getByText("🛒")).toBeInTheDocument();
  });

  it("exposes the title via aria-label for screen readers", () => {
    render(
      <TestPackHeroFallback
        industry="eshop"
        emoji="🛒"
        title="E-shop pack"
        testid="fixture-hero"
      />,
    );
    expect(screen.getByTestId("fixture-hero")).toHaveAttribute("aria-label", "E-shop pack");
    expect(screen.getByTestId("fixture-hero")).toHaveAttribute("role", "img");
  });

  it("maps industry 'eshop' to a blue-led gradient", () => {
    render(<TestPackHeroFallback industry="eshop" emoji="🛒" title="x" testid="hero-eshop" />);
    expect(screen.getByTestId("hero-eshop").className).toMatch(/from-blue-600/);
  });

  it("maps industry 'gastro' to an orange-led gradient", () => {
    render(<TestPackHeroFallback industry="gastro" emoji="🍴" title="x" testid="hero-gastro" />);
    expect(screen.getByTestId("hero-gastro").className).toMatch(/from-orange-500/);
  });

  it("uses a taller aspect ratio for the featured variant", () => {
    render(
      <TestPackHeroFallback
        industry="eshop"
        emoji="🛒"
        title="x"
        variant="featured"
        testid="hero-feat"
      />,
    );
    expect(screen.getByTestId("hero-feat").className).toMatch(/aspect-\[16\/7\]/);
  });
});
