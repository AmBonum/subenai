import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PersonaComparisonTable } from "@/components/schools/PersonaComparisonTable";

describe("PersonaComparisonTable", () => {
  it("renders the section heading + subheading", () => {
    render(<PersonaComparisonTable />);
    expect(screen.getByTestId("schools-persona-comparison")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-comparison-heading")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-comparison-subheading")).toBeInTheDocument();
  });

  it("renders 3 column headers on desktop", () => {
    render(<PersonaComparisonTable />);
    expect(screen.getByTestId("schools-persona-col-riaditel")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-col-itkoord")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-col-ucitel")).toBeInTheDocument();
  });

  it("renders 6 feature rows", () => {
    render(<PersonaComparisonTable />);
    expect(screen.getByTestId("schools-persona-row-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-row-csv")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-row-gdpr")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-row-max")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-row-setup")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-row-signoff")).toBeInTheDocument();
  });

  it("renders mobile stacked-card variant alongside desktop table", () => {
    render(<PersonaComparisonTable />);
    expect(screen.getByTestId("schools-persona-stack-mobile")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-card-riaditel")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-card-itkoord")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-card-ucitel")).toBeInTheDocument();
  });
});
