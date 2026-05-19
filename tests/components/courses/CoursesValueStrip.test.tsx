import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CoursesValueStrip } from "@/components/courses/CoursesValueStrip";

describe("CoursesValueStrip — E25 Phase 2 trust tiles", () => {
  it("renders three tiles with the canonical Slovak labels", () => {
    render(<CoursesValueStrip />);
    expect(screen.getByTestId("courses-value-strip")).toBeInTheDocument();
    expect(screen.getByTestId("courses-value-strip-short")).toHaveTextContent("10 minút");
    expect(screen.getByTestId("courses-value-strip-real")).toHaveTextContent("Reálne príklady");
    expect(screen.getByTestId("courses-value-strip-free")).toHaveTextContent("Bezplatné");
  });

  it("renders supporting copy on each tile", () => {
    render(<CoursesValueStrip />);
    expect(screen.getByTestId("courses-value-strip-short")).toHaveTextContent(
      "Krátka stránka, nie 60-stranové PDF",
    );
    expect(screen.getByTestId("courses-value-strip-real")).toHaveTextContent(
      "Skutočné podvody zo slovenského webu",
    );
    expect(screen.getByTestId("courses-value-strip-free")).toHaveTextContent(
      "Bez registrácie, bez reklám",
    );
  });
});
