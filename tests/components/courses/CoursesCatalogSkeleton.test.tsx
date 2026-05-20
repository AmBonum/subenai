import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CoursesCatalogSkeleton } from "@/components/courses/CoursesCatalogSkeleton";

describe("CoursesCatalogSkeleton — loading placeholder grid", () => {
  it("exposes the canonical data-testid root", () => {
    render(<CoursesCatalogSkeleton />);
    expect(screen.getByTestId("courses-catalog-skeleton")).toBeInTheDocument();
  });

  it("is aria-hidden so screen readers skip the placeholder grid", () => {
    render(<CoursesCatalogSkeleton />);
    expect(screen.getByTestId("courses-catalog-skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders exactly 6 placeholder cards", () => {
    const { container } = render(<CoursesCatalogSkeleton />);
    // Each placeholder card is the direct child div of the skeleton root.
    const root = screen.getByTestId("courses-catalog-skeleton");
    const placeholders = root.querySelectorAll(":scope > div");
    expect(placeholders.length).toBe(6);
    // Sanity check: the hero band of every placeholder is the animate-pulse
    // bar — there should be at least 6 of those in the rendered tree.
    const pulseBars = container.querySelectorAll(".animate-pulse");
    expect(pulseBars.length).toBeGreaterThanOrEqual(6);
  });
});
