import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipToContentLink } from "@/components/layout/SkipToContentLink";

describe("SkipToContentLink", () => {
  it("targets #main and carries the verbatim Slovak label", () => {
    render(<SkipToContentLink />);
    const link = screen.getByTestId("skip-to-content-link");
    expect(link).toHaveAttribute("href", "#main");
    expect(link).toHaveTextContent("Preskočiť na obsah");
  });

  it("is visually hidden until focused (sr-only + focus:not-sr-only)", () => {
    render(<SkipToContentLink />);
    const link = screen.getByTestId("skip-to-content-link");
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });

  it("renders as the first focusable element when mounted first", () => {
    render(
      <>
        <SkipToContentLink />
        <a href="/other">other</a>
      </>,
    );
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("data-testid", "skip-to-content-link");
  });
});
