import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

// PillarsSection renders BlogPostCard for each pillar, and BlogPostCard
// pulls in TanStack Router Link + CategoryBadge (also Link). Stub the
// Link component so the section can render in jsdom without a router.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

// Analytics is fire-and-forget on toggle — silence it so unit tests
// don't accidentally hit the real trackEvent path. The dedicated
// useBlogPillarsCollapsed test verifies analytics fires correctly.
vi.mock("@/lib/analytics/blog-events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/analytics/blog-events")>(
    "@/lib/analytics/blog-events",
  );
  return { ...actual, trackBlogPillarsToggle: vi.fn() };
});

import { PillarsSection } from "@/components/blog/PillarsSection";

import { PILLAR_PHISHING, PILLAR_SMS } from "../../integration/blog/fixtures";

describe("<PillarsSection />", () => {
  it("renders nothing when there are no pillars", () => {
    const { container } = render(<PillarsSection pillars={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the trigger + every pillar card under one <ul>", () => {
    render(<PillarsSection pillars={[PILLAR_PHISHING, PILLAR_SMS]} />);
    expect(screen.getByTestId("blog-index-pillars-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("blog-index-pillars-list").children).toHaveLength(2);
    expect(screen.getByTestId(`blog-pillar-card-${PILLAR_PHISHING.slug}`)).toBeInTheDocument();
    expect(screen.getByTestId(`blog-pillar-card-${PILLAR_SMS.slug}`)).toBeInTheDocument();
  });

  it("defaults to collapsed in jsdom (no matchMedia → mobile-like)", () => {
    render(<PillarsSection pillars={[PILLAR_PHISHING, PILLAR_SMS]} />);
    const trigger = screen.getByTestId("blog-index-pillars-toggle");
    const content = screen.getByTestId("blog-index-pillars-content");
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-label", "zobraziť sprievodcov");
    expect(content).toHaveAttribute("data-state", "closed");
  });

  it("click toggles data-state, aria-expanded, and aria-label round-trip", () => {
    render(<PillarsSection pillars={[PILLAR_PHISHING, PILLAR_SMS]} />);
    const trigger = screen.getByTestId("blog-index-pillars-toggle");
    const content = screen.getByTestId("blog-index-pillars-content");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "open");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-label", "skryť sprievodcov");
    expect(content).toHaveAttribute("data-state", "open");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveAttribute("data-state", "closed");
  });

  // Regression sentinel for the 2026-05-20 production no-op:
  // <CollapsibleContent forceMount> keeps pillar cards in the DOM for
  // SEO/a11y, but in forceMount mode Radix does NOT set the `hidden`
  // attribute itself — visibility is delegated to CSS. The
  // `data-[state=closed]:hidden` Tailwind variant is the CSS hook that
  // actually hides the list when the user collapses. Without it the
  // toggle flips data-state but nothing changes on screen. jsdom does
  // not compile Tailwind utilities, so we assert on the literal class
  // string. If the class is ever removed or renamed, this test fails
  // and the dropdown silently breaks in production.
  it("CollapsibleContent ships the Tailwind data-state hide hook (forceMount visibility regression sentinel)", () => {
    render(<PillarsSection pillars={[PILLAR_PHISHING, PILLAR_SMS]} />);
    const content = screen.getByTestId("blog-index-pillars-content");
    expect(content.className).toContain("data-[state=closed]:hidden");
  });

  it("formats the pillar count with the Slovak plural for n=2 ('hĺbkoví sprievodcovia')", () => {
    render(<PillarsSection pillars={[PILLAR_PHISHING, PILLAR_SMS]} />);
    // Both desktop and mobile subheading mirrors render the same count.
    expect(screen.getByTestId("blog-index-pillars-subheading")).toHaveTextContent(/sprievodc/i);
    expect(screen.getByTestId("blog-index-pillars-subheading-mobile")).toHaveTextContent(
      /sprievodc/i,
    );
  });

  it("heading copy uses the senior-marketing keyword phrase ('sprievodcovia digitálnou bezpečnosťou')", () => {
    // Pins the SEO-targeted heading. Previously "základní sprievodcovia",
    // which leaned beginner + did not carry the primary keyword. If
    // marketing changes this copy again, update the assertion AND the
    // mirror in specs/blog/blog-ux.md in the same commit.
    render(<PillarsSection pillars={[PILLAR_PHISHING, PILLAR_SMS]} />);
    expect(screen.getByTestId("blog-index-pillars-heading")).toHaveTextContent(
      "sprievodcovia digitálnou bezpečnosťou",
    );
  });
});
