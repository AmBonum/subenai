import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClipboardList } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard testId="card" label="Aktívne testy" value={42} icon={ClipboardList} />);
    expect(screen.getByTestId("card-label").textContent).toBe("Aktívne testy");
    expect(screen.getByTestId("card-value").textContent).toBe("42");
  });

  it("formats numeric values with sk-SK locale (non-ASCII thousands sep)", () => {
    render(<StatCard testId="card" label="x" value={1234} icon={ClipboardList} />);
    expect(screen.getByTestId("card-value").textContent).toMatch(/1\D234/);
  });

  it("renders delta trend when provided", () => {
    render(<StatCard testId="card" label="x" value="50%" delta={12} icon={ClipboardList} />);
    expect(screen.getByTestId("card-delta")).toBeInTheDocument();
    expect(screen.getByTestId("card-delta").textContent).toContain("12");
  });

  it("does not render delta block when delta is undefined", () => {
    render(<StatCard testId="card" label="x" value="0" icon={ClipboardList} />);
    expect(screen.queryByTestId("card-delta")).toBeNull();
  });
});
