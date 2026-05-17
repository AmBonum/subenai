import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/admin/PageHeader";

describe("PageHeader", () => {
  it("renders title, description, and actions", () => {
    render(
      <PageHeader
        title="Prehľad"
        description="Zhrnutie aktivity"
        testId="admin-test-page-header"
        actions={<button type="button">New</button>}
      />,
    );
    expect(screen.getByTestId("admin-test-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-test-page-header-title")).toHaveTextContent("Prehľad");
    expect(screen.getByTestId("admin-test-page-header-description")).toHaveTextContent(
      "Zhrnutie aktivity",
    );
    expect(screen.getByTestId("admin-test-page-header-actions")).toBeInTheDocument();
  });

  it("omits description and actions slots when not provided", () => {
    render(<PageHeader title="Iba názov" testId="admin-empty-page-header" />);
    expect(screen.queryByTestId("admin-empty-page-header-description")).toBeNull();
    expect(screen.queryByTestId("admin-empty-page-header-actions")).toBeNull();
  });
});
