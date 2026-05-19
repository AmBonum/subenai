import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";

// E16.4 — TOC parses headings out of the raw markdown (not the DOM)
// so we test it in isolation with literal mdx strings. The slugifier
// behaviour is locked here too — if it changes, headings + anchors
// in BlogPostBody fall out of sync and these tests catch it.

describe("BlogTableOfContents", () => {
  it("renders nothing when fewer than 3 headings are present", () => {
    const { container } = render(
      <BlogTableOfContents mdx={"## Iba jedna sekcia\n\nodsek"} label="obsah" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a list of H2/H3 headings with slugified ids", () => {
    const mdx = [
      "## Prvá sekcia",
      "",
      "## Druhá sekcia",
      "",
      "### Pod-sekcia s diakritikou",
      "",
      "## Záver",
    ].join("\n");
    render(<BlogTableOfContents mdx={mdx} label="obsah" />);
    expect(screen.getByTestId("blog-toc-label")).toHaveTextContent("obsah");
    expect(screen.getByTestId("blog-toc-link-prva-sekcia")).toHaveTextContent("Prvá sekcia");
    expect(screen.getByTestId("blog-toc-link-druha-sekcia")).toBeInTheDocument();
    expect(screen.getByTestId("blog-toc-link-pod-sekcia-s-diakritikou")).toBeInTheDocument();
    expect(screen.getByTestId("blog-toc-link-zaver")).toBeInTheDocument();
  });

  it("dedupes colliding slugs with a numeric suffix", () => {
    const mdx = ["## Faq", "", "## Faq", "", "## Faq"].join("\n");
    render(<BlogTableOfContents mdx={mdx} label="obsah" />);
    expect(screen.getByTestId("blog-toc-link-faq")).toBeInTheDocument();
    expect(screen.getByTestId("blog-toc-link-faq-1")).toBeInTheDocument();
    expect(screen.getByTestId("blog-toc-link-faq-2")).toBeInTheDocument();
  });

  it("skips headings inside fenced code blocks", () => {
    const mdx = [
      "## Prvá",
      "",
      "```",
      "## Toto je v kóde a nemá byť v TOC",
      "```",
      "",
      "## Druhá",
      "",
      "## Tretia",
    ].join("\n");
    render(<BlogTableOfContents mdx={mdx} label="obsah" />);
    expect(screen.queryByTestId("blog-toc-link-toto-je-v-kode-a-nema-byt-v-toc")).toBeNull();
    expect(screen.getByTestId("blog-toc-link-prva")).toBeInTheDocument();
    expect(screen.getByTestId("blog-toc-link-druha")).toBeInTheDocument();
    expect(screen.getByTestId("blog-toc-link-tretia")).toBeInTheDocument();
  });
});
