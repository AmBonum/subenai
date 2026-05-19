import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

import { COURSES } from "@/content/courses";

// Radix Select is portal-mounted only when open, and the pointer-events
// pipeline in jsdom makes the real component hostile to unit testing.
// Mock with a plain <select> that exposes the same value/onValueChange
// contract — that's all we need to verify the picker's mapping logic
// (empty string ↔ "__none__" sentinel and propagation up).
vi.mock("@/components/ui/select", () => {
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (v: string) => void;
      children: ReactNode;
    }) => (
      <select
        data-testid="mock-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({
      value,
      children,
      ...rest
    }: {
      value: string;
      children: ReactNode;
    } & React.HTMLAttributes<HTMLOptionElement>) => (
      <option value={value} {...rest}>
        {children}
      </option>
    ),
  };
});

import { RelatedCoursePicker } from "@/components/admin/blog/RelatedCoursePicker";

describe("RelatedCoursePicker", () => {
  it("renders a 'Žiadne' (none) option plus one option per registered course", () => {
    render(<RelatedCoursePicker value="" onChange={() => {}} />);
    expect(screen.getByTestId("admin-blog-editor-related-course-option-none")).toBeInTheDocument();
    for (const course of COURSES) {
      expect(
        screen.getByTestId(`admin-blog-editor-related-course-option-${course.slug}`),
      ).toBeInTheDocument();
    }
  });

  it("maps the form-state empty string to the internal NONE sentinel on the trigger", () => {
    render(<RelatedCoursePicker value="" onChange={() => {}} />);
    const select = screen.getByTestId("mock-select") as HTMLSelectElement;
    expect(select.value).toBe("__none__");
  });

  it("passes through a known course slug as the current value", () => {
    const someSlug = COURSES[0].slug;
    render(<RelatedCoursePicker value={someSlug} onChange={() => {}} />);
    const select = screen.getByTestId("mock-select") as HTMLSelectElement;
    expect(select.value).toBe(someSlug);
  });

  it("calls onChange with the slug when a course is picked", () => {
    const onChange = vi.fn();
    const targetSlug = COURSES[0].slug;
    render(<RelatedCoursePicker value="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId("mock-select"), { target: { value: targetSlug } });
    expect(onChange).toHaveBeenCalledWith(targetSlug);
  });

  it("calls onChange with empty string when NONE sentinel is picked (translates outward)", () => {
    const onChange = vi.fn();
    render(<RelatedCoursePicker value={COURSES[0].slug} onChange={onChange} />);
    fireEvent.change(screen.getByTestId("mock-select"), { target: { value: "__none__" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("sorts course options alphabetically by slug (stable UX, decoupled from import order)", () => {
    render(<RelatedCoursePicker value="" onChange={() => {}} />);
    const select = screen.getByTestId("mock-select");
    const options = Array.from(select.querySelectorAll("option"))
      .map((o) => o.getAttribute("value"))
      .filter((v): v is string => v !== null && v !== "__none__");
    const sorted = [...options].sort((a, b) => a.localeCompare(b));
    expect(options).toEqual(sorted);
  });
});
