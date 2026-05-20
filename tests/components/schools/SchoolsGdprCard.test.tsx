import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { SchoolsGdprCard } from "@/components/schools/SchoolsGdprCard";

describe("SchoolsGdprCard", () => {
  it("renders the card root + heading", () => {
    render(<SchoolsGdprCard />);
    expect(screen.getByTestId("schools-gdpr-card")).toBeInTheDocument();
    expect(screen.getByTestId("schools-gdpr-heading")).toBeInTheDocument();
  });

  it("preserves the controller / processor legal copy", () => {
    render(<SchoolsGdprCard />);
    expect(screen.getByText(/ty kontrolór/i)).toBeInTheDocument();
    expect(screen.getByText(/sprostredkovateľ/i)).toBeInTheDocument();
  });

  it("surfaces the DPA callout box (no longer buried in a mailto)", () => {
    render(<SchoolsGdprCard />);
    expect(screen.getByTestId("schools-gdpr-dpa-box")).toBeInTheDocument();
    expect(screen.getByTestId("schools-gdpr-dpa-heading")).toBeInTheDocument();
    expect(screen.getByTestId("schools-gdpr-dpa-body")).toBeInTheDocument();
  });

  it("DPA CTA is a mailto link with DPA-prefilled subject when flag is off", () => {
    // In Vitest, import.meta.env.VITE_DPA_FLOW_ENABLED is unset so the
    // feature-flag module resolves to false — mailto branch fires.
    render(<SchoolsGdprCard />);
    const link = screen.getByTestId("schools-gdpr-dpa-link");
    const href = link.getAttribute("href") ?? "";
    expect(href).toMatch(/^mailto:/);
    expect(href).toContain("DPA");
  });

  it("links to /privacy via the disclosure bullet", () => {
    render(<SchoolsGdprCard />);
    // The "zásady spracovania" Link points to ROUTES.privacy
    const links = Array.from(document.querySelectorAll("[data-to]"));
    const privacyLink = links.find((el) => el.getAttribute("data-to") === "/privacy");
    expect(privacyLink).toBeTruthy();
  });
});
