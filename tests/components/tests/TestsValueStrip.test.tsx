import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TestsValueStrip } from "@/components/tests/TestsValueStrip";

describe("TestsValueStrip — E25 Phase 1 trust tiles", () => {
  it("renders three tiles with the canonical labels", () => {
    render(<TestsValueStrip />);
    expect(screen.getByTestId("tests-value-strip")).toBeInTheDocument();
    expect(screen.getByTestId("tests-value-strip-anonymous")).toHaveTextContent("Anonymne");
    expect(screen.getByTestId("tests-value-strip-fast")).toHaveTextContent("5 minút");
    expect(screen.getByTestId("tests-value-strip-free")).toHaveTextContent("Zadarmo");
  });

  it("renders supporting copy on each tile", () => {
    render(<TestsValueStrip />);
    expect(screen.getByTestId("tests-value-strip-anonymous")).toHaveTextContent(
      "Žiadne meno, e-mail ani IP",
    );
    expect(screen.getByTestId("tests-value-strip-fast")).toHaveTextContent(
      "Krátky test, hneď výsledok",
    );
    expect(screen.getByTestId("tests-value-strip-free")).toHaveTextContent(
      "Bez paywall-u, bez registrácie",
    );
  });
});
