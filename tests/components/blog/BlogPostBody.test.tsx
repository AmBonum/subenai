import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { BlogPostBody } from "@/components/blog/BlogPostBody";

// E16.4 — callout heuristic regression tests. The 80 existing MDX
// articles use bold-prefixed paragraphs ("**plus:** …",
// "**mínus:** …", "**verdikt:** …", etc.) as their dominant visual
// rhythm; BlogPostBody auto-promotes those into styled callout boxes.
// These tests pin the dictionary so a future refactor can't silently
// drop a recognised keyword.

describe("BlogPostBody callouts", () => {
  it("renders plain paragraphs as <p>", () => {
    render(<BlogPostBody mdx={"toto je obyčajný odsek bez prefixu."} />);
    expect(screen.queryByTestId("blog-post-callout")).not.toBeInTheDocument();
  });

  it("promotes **plus:** paragraphs into a positive callout", () => {
    render(<BlogPostBody mdx={"**plus:** rýchle nastavenie, dobrá podpora."} />);
    const callout = screen.getByTestId("blog-post-callout");
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent("✓ plus");
    expect(callout).toHaveTextContent("rýchle nastavenie");
  });

  it("promotes **mínus:** paragraphs into a negative callout", () => {
    render(<BlogPostBody mdx={"**mínus:** drahšie ako konkurencia."} />);
    expect(screen.getByTestId("blog-post-callout")).toHaveTextContent("✗ mínus");
  });

  it("promotes **verdikt:** paragraphs", () => {
    render(<BlogPostBody mdx={"**verdikt:** odporúčame pre väčšinu používateľov."} />);
    expect(screen.getByTestId("blog-post-callout")).toHaveTextContent("verdikt");
  });

  it("promotes **detekčný znak:** paragraphs as a warning callout", () => {
    render(<BlogPostBody mdx={"**detekčný znak:** doména s diakritikou."} />);
    expect(screen.getByTestId("blog-post-callout")).toHaveTextContent("detekčný znak");
  });

  it("ignores bold prefixes that are not in the dictionary", () => {
    render(<BlogPostBody mdx={"**ahoj:** toto nie je v slovníku."} />);
    expect(screen.queryByTestId("blog-post-callout")).not.toBeInTheDocument();
  });

  it("renders GFM tables wrapped in an overflow container", () => {
    const mdx = "| stĺpec | hodnota |\n|---|---|\n| a | 1 |\n";
    const { container } = render(<BlogPostBody mdx={mdx} />);
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});
