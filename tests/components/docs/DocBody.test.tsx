import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { DocBody } from "@/components/docs/DocBody";

describe("DocBody", () => {
  it("mounts the named 3D scene between markdown runs", () => {
    render(<DocBody body={"Úvod.\n\n[[scene3d:shield-stack|Štít]]\n\nZáver."} />);
    const figure = screen.getByTestId("docs-scene3d");
    expect(figure).toHaveAttribute("data-scene", "shield-stack");
    expect(screen.getByTestId("scene3d-shield-stack-caption")).toHaveTextContent("Štít");
    expect(screen.getByText("Úvod.")).toBeInTheDocument();
    expect(screen.getByText("Záver.")).toBeInTheDocument();
    expect(screen.queryByText(/\[\[scene3d/)).toBeNull();
  });

  it("renders plain markdown without a scene", () => {
    render(<DocBody body="Len text." />);
    expect(screen.queryByTestId("docs-scene3d")).toBeNull();
    expect(screen.getByText("Len text.")).toBeInTheDocument();
  });
});
