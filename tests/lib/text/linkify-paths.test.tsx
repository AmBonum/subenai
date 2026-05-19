import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { linkifyPaths } from "@/lib/text/linkify-paths";

function renderResult(text: string) {
  return render(<div data-testid="root">{linkifyPaths(text)}</div>);
}

describe("linkifyPaths — E27 inline path → clickable link converter", () => {
  it("returns the original string when no paths are present", () => {
    renderResult("Toto je obyčajný text bez ciest.");
    const root = screen.getByTestId("root");
    expect(root).toHaveTextContent("Toto je obyčajný text bez ciest.");
    // No <a> elements emitted.
    expect(root.querySelectorAll("a")).toHaveLength(0);
  });

  it("converts a single trailing path to an anchor with the path as href", () => {
    renderResult("Podpor projekt na /support.");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/support");
    expect(link).toHaveTextContent("/support");
    // The trailing period stays as plain text.
    expect(screen.getByTestId("root")).toHaveTextContent("Podpor projekt na /support.");
  });

  it("converts a multi-segment path", () => {
    renderResult("Otvor /courses/email-phishing teraz.");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/courses/email-phishing");
    expect(link).toHaveTextContent("/courses/email-phishing");
  });

  it("converts MULTIPLE paths in the same string", () => {
    renderResult("Spusti /test alebo zostav vlastný na /test/builder.");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/test");
    expect(links[1]).toHaveAttribute("href", "/test/builder");
  });

  it("handles a path inside parentheses without grabbing the closing paren", () => {
    renderResult("Pošli odkaz (napr. /tests/eshop) kolegom.");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/tests/eshop");
    expect(link).toHaveTextContent("/tests/eshop");
    // Closing paren should remain as plain text after the anchor.
    expect(screen.getByTestId("root").textContent).toContain(") kolegom.");
  });

  it("does NOT match uppercase-starting or numeric-starting tokens", () => {
    renderResult("Verzia 5/10 a /Test/X — žiadne odkazy tu.");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("attaches a stable data-testid derived from the path", () => {
    renderResult("Pozri /tests/eshop pre detaily.");
    expect(screen.getByTestId("linkify-path-tests-eshop")).toBeInTheDocument();
  });

  it("uses the default link-style className with primary color + underline", () => {
    renderResult("Pozri /support.");
    const link = screen.getByRole("link");
    expect(link.className).toMatch(/text-primary/);
    expect(link.className).toMatch(/underline/);
  });

  it("accepts a custom className override", () => {
    const { container } = render(
      <div>{linkifyPaths("Pozri /support.", { className: "custom-link" })}</div>,
    );
    const link = container.querySelector("a");
    expect(link?.className).toBe("custom-link");
  });
});
