import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { CategoryFilter } from "@/components/blog/CategoryFilter";

const OPTIONS = [
  { slug: "phishing-a-emaily", name: "phishing a emaily", count: 12 },
  { slug: "sms-a-telefon", name: "sms a telefón", count: 8 },
  { slug: "ai-scamy", name: "ai scamy", count: 5 },
  { slug: "socialne-siete", name: "sociálne siete", count: 4 },
  { slug: "fake-eshopy", name: "fake e-shopy", count: 3 },
];

describe("<CategoryFilter />", () => {
  it("renders one chip per option plus the 'všetko' chip", () => {
    render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={() => {}} totalCount={32} />,
    );
    expect(screen.getByTestId("blog-category-filter-all")).toBeInTheDocument();
    for (const opt of OPTIONS) {
      expect(screen.getByTestId(`blog-category-filter-${opt.slug}`)).toBeInTheDocument();
    }
  });

  it("'všetko' is aria-pressed when activeSlug is null; chip is aria-pressed when its slug matches", () => {
    const { rerender } = render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={() => {}} totalCount={32} />,
    );
    expect(screen.getByTestId("blog-category-filter-all")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("blog-category-filter-phishing-a-emaily")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    rerender(
      <CategoryFilter
        options={OPTIONS}
        activeSlug="phishing-a-emaily"
        onChange={() => {}}
        totalCount={32}
      />,
    );
    expect(screen.getByTestId("blog-category-filter-all")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("blog-category-filter-phishing-a-emaily")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("click on a chip calls onChange with its slug; click on 'všetko' calls onChange(null)", () => {
    const onChange = vi.fn();
    render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={onChange} totalCount={32} />,
    );
    fireEvent.click(screen.getByTestId("blog-category-filter-phishing-a-emaily"));
    expect(onChange).toHaveBeenCalledWith("phishing-a-emaily");
    fireEvent.click(screen.getByTestId("blog-category-filter-all"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  // Mobile-layout regression sentinel: until 2026-05-20 the row used
  // `overflow-x-auto` on mobile + `md:flex-wrap` on desktop, giving a
  // horizontal scrollbar that hid half the categories on phones. The
  // fix collapses both viewports onto `flex flex-wrap gap-2`. If a
  // future refactor reintroduces an overflow class on the container,
  // this test fires before it ships.
  it("uses flex-wrap (no horizontal overflow) so mobile shows every chip without a scrollbar", () => {
    render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={() => {}} totalCount={32} />,
    );
    const container = screen.getByTestId("blog-category-filter");
    expect(container.className).toContain("flex-wrap");
    expect(container.className).not.toContain("overflow-x-auto");
    expect(container.className).not.toContain("overflow-x-scroll");
  });

  it("no longer renders the right-edge fade mask (mobile scroll affordance is gone)", () => {
    // The fade was a `pointer-events-none` gradient that signaled
    // "more chips →". With wrap there's nothing to scroll, so the
    // affordance is dead weight — gone in the same change.
    render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={() => {}} totalCount={32} />,
    );
    expect(screen.queryByTestId("blog-category-filter-edge-fade")).toBeNull();
  });

  // Mobile collapsible — keeps the filter strip to one screen by hiding
  // chips past the top-3 (most-popular, since options arrive count-sorted).
  // jsdom can't compute Tailwind responsive variants, so we assert on the
  // class shape: hidden chips get `hidden md:inline-flex`, visible chips
  // get plain `inline-flex`. The desktop layer overrides via `md:` and
  // every chip becomes visible.
  it("on mobile, hides chips past the top-3 with 'hidden md:inline-flex' (desktop unaffected)", () => {
    render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={() => {}} totalCount={32} />,
    );
    // Top 3 by count: phishing (12), sms (8), ai (5)
    const visible1 = screen.getByTestId("blog-category-filter-phishing-a-emaily");
    const visible2 = screen.getByTestId("blog-category-filter-sms-a-telefon");
    const visible3 = screen.getByTestId("blog-category-filter-ai-scamy");
    const hidden1 = screen.getByTestId("blog-category-filter-socialne-siete");
    const hidden2 = screen.getByTestId("blog-category-filter-fake-eshopy");

    expect(visible1.className).toContain("inline-flex");
    expect(visible1.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(visible2.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(visible3.className).not.toMatch(/(^|\s)hidden(\s|$)/);

    expect(hidden1.className).toContain("hidden");
    expect(hidden1.className).toContain("md:inline-flex");
    expect(hidden2.className).toContain("hidden");
    expect(hidden2.className).toContain("md:inline-flex");
  });

  it("renders the 'ďalšie kategórie (N)' toggle with the count of hidden chips", () => {
    render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={() => {}} totalCount={32} />,
    );
    const toggle = screen.getByTestId("blog-category-filter-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // 5 options total, top-3 visible → 2 hidden
    expect(toggle).toHaveTextContent("ďalšie kategórie (2)");
  });

  it("clicking the toggle lifts the mobile-hide on every chip and flips aria-expanded", () => {
    render(
      <CategoryFilter options={OPTIONS} activeSlug={null} onChange={() => {}} totalCount={32} />,
    );
    const toggle = screen.getByTestId("blog-category-filter-toggle");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("skryť kategórie");
    // Every previously-hidden chip now starts with `inline-flex` (not `hidden`).
    const hidden1 = screen.getByTestId("blog-category-filter-socialne-siete");
    const hidden2 = screen.getByTestId("blog-category-filter-fake-eshopy");
    expect(hidden1.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(hidden2.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("when the active filter sits outside the top-3, the active chip stays visible on mobile", () => {
    // Without this fallback, the user would see "všetko" pressed at the
    // top while the URL filter is on a hidden chip — confusing.
    render(
      <CategoryFilter
        options={OPTIONS}
        activeSlug="fake-eshopy"
        onChange={() => {}}
        totalCount={32}
      />,
    );
    const active = screen.getByTestId("blog-category-filter-fake-eshopy");
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(active.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("does NOT render the toggle when every option fits in the visible slice", () => {
    // 3 options total = no overflow → no expander UI.
    render(
      <CategoryFilter
        options={OPTIONS.slice(0, 3)}
        activeSlug={null}
        onChange={() => {}}
        totalCount={10}
      />,
    );
    expect(screen.queryByTestId("blog-category-filter-toggle")).toBeNull();
  });
});
