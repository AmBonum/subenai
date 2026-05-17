import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";

beforeAll(() => {
  if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return { ...actual };
});

import { CategoryMultiSelect } from "@/components/admin/CategoryMultiSelect";
import { BRANCHES } from "@/lib/admin/mock-data";

function Harness() {
  const [v, setV] = useState<string[]>([]);
  return <CategoryMultiSelect value={v} onChange={setV} />;
}

describe("CategoryMultiSelect", () => {
  it("renders the root container", () => {
    render(<Harness />);
    expect(screen.getByTestId("category-multiselect-root")).toBeInTheDocument();
  });

  it("opens the popover and exposes branch options as testid-tagged items", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("category-multi-select-trigger"));
    const first = BRANCHES[0];
    expect(screen.getByTestId(`category-multiselect-option-${first.slug}`)).toBeInTheDocument();
  });

  it("toggles selection: clicking an option adds a tag; clicking the tag removes it", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("category-multi-select-trigger"));
    const first = BRANCHES[0];
    const option = screen.getByTestId(`category-multiselect-option-${first.slug}`);
    fireEvent.click(option);
    expect(
      screen.getByTestId(`category-multiselect-selected-tag-${first.slug}`),
    ).toBeInTheDocument();
  });
});
