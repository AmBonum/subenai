import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ShieldCheck } from "lucide-react";

import { FaqAccordion } from "@/components/ui/faq/FaqAccordion";

const baseProps = {
  items: [{ key: "q1" }, { key: "q2" }, { key: "q3" }],
  getQ: (key: string) => `Question ${key}`,
  getA: (key: string) => `Answer ${key}`,
  testIdPrefix: "demo-faq",
  anchorPrefix: "anchor-demo",
  heading: "Heading",
};

describe("FaqAccordion — E26 shared senior FAQ ui component", () => {
  it("renders heading + one item per key", () => {
    render(<FaqAccordion {...baseProps} />);
    expect(screen.getByTestId("demo-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("demo-faq-heading")).toHaveTextContent("Heading");
    ["q1", "q2", "q3"].forEach((k) => {
      expect(screen.getByTestId(`demo-faq-item-${k}`)).toBeInTheDocument();
      expect(screen.getByTestId(`demo-faq-trigger-${k}`)).toHaveTextContent(`Question ${k}`);
    });
  });

  // Regression: the trigger used to hide ALL direct-child svgs via
  // [&>svg]:hidden (hiding its own custom chevron along with the
  // built-in one) → no visible chevron at all. Exactly ONE chevron
  // (the built-in from ui/accordion.tsx) must render, unhidden.
  it("each trigger renders exactly one visible chevron icon", () => {
    render(<FaqAccordion {...baseProps} />);
    const trigger = screen.getByTestId("demo-faq-trigger-q1");
    expect(trigger.querySelectorAll("svg")).toHaveLength(1);
    expect(trigger.className).not.toContain("[&>svg]:hidden");
  });

  it("attaches stable anchor IDs per item from anchorPrefix", () => {
    render(<FaqAccordion {...baseProps} />);
    expect(screen.getByTestId("demo-faq-item-q1")).toHaveAttribute("id", "anchor-demo-q-q1");
    expect(screen.getByTestId("demo-faq-item-q2")).toHaveAttribute("id", "anchor-demo-q-q2");
  });

  it("omits eyebrow + subheading + popular badge + toggle + footer when not provided", () => {
    render(<FaqAccordion {...baseProps} />);
    expect(screen.queryByTestId("demo-faq-eyebrow")).not.toBeInTheDocument();
    expect(screen.queryByTestId("demo-faq-subheading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("demo-faq-popular-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("demo-faq-toggle-all")).not.toBeInTheDocument();
    expect(screen.queryByTestId("demo-faq-footer")).not.toBeInTheDocument();
  });

  it("renders eyebrow when provided", () => {
    render(<FaqAccordion {...baseProps} eyebrow="EYEBROW" />);
    expect(screen.getByTestId("demo-faq-eyebrow")).toHaveTextContent("EYEBROW");
  });

  it("renders popular badge on the FIRST item only", () => {
    render(<FaqAccordion {...baseProps} popularBadge="Top" />);
    expect(screen.getByTestId("demo-faq-popular-badge")).toHaveTextContent("Top");
    expect(screen.getAllByTestId("demo-faq-popular-badge")).toHaveLength(1);
  });

  it("renders icon tile when an item supplies an icon", () => {
    const items = [{ key: "q1", icon: ShieldCheck }, { key: "q2" }];
    render(<FaqAccordion {...baseProps} items={items} />);
    expect(screen.getByTestId("demo-faq-icon-q1")).toBeInTheDocument();
    expect(screen.queryByTestId("demo-faq-icon-q2")).not.toBeInTheDocument();
  });

  it("expand-all toggle flips between expand and collapse labels", () => {
    render(<FaqAccordion {...baseProps} expandAllLabel="Expand" collapseAllLabel="Collapse" />);
    const toggle = screen.getByTestId("demo-faq-toggle-all");
    expect(toggle).toHaveTextContent("Expand");
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent("Collapse");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("renders footer with multiple CTAs", () => {
    render(
      <FaqAccordion
        {...baseProps}
        footerLabel="Need more?"
        footerCtas={[
          { label: "Blog", href: "/blog", testid: "ft-blog" },
          { label: "Help", href: "/help", testid: "ft-help" },
        ]}
      />,
    );
    expect(screen.getByTestId("demo-faq-footer")).toHaveTextContent("Need more?");
    expect(screen.getByTestId("ft-blog")).toHaveAttribute("href", "/blog");
    expect(screen.getByTestId("ft-help")).toHaveAttribute("href", "/help");
  });

  it("supports ReactNode answers (not just plain strings)", () => {
    render(
      <FaqAccordion
        {...baseProps}
        getA={(key) => <span data-testid={`rich-${key}`}>rich {key}</span>}
      />,
    );
    // Radix removes collapsed content from the DOM — expand q1 first
    // by clicking its trigger, then assert the ReactNode rendered.
    fireEvent.click(screen.getByTestId("demo-faq-trigger-q1"));
    expect(screen.getByTestId("rich-q1")).toBeInTheDocument();
    expect(screen.getByTestId("rich-q1")).toHaveTextContent("rich q1");
  });
});
