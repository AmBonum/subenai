import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to?: string;
      children?: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

import { Route } from "@/routes/admin/settings.lazy";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/settings — GDPR / compliance dashboard", () => {
  it("renders the read-only notice + DPA + sub-processors + runbook sections", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-settings-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-readonly-notice")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-dpa-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-subprocessors-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-runbook-section")).toBeInTheDocument();
  });

  it("surfaces all four DPA setting rows (flow + watermark + version + retention)", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-settings-dpa-flow")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-dpa-watermark")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-dpa-version")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-dpa-retention")).toBeInTheDocument();
  });

  it("renders the sub-processor list from src/lib/dpa/sub-processors.ts", () => {
    // Single source of truth for Art. 28(3)(g) disclosure — if a vendor
    // is added or removed, this test makes sure the admin page surfaces
    // the change.
    render(<Page />);
    expect(screen.getByTestId("admin-settings-subprocessors-list")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-subprocessor-supabase-inc")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-subprocessor-cloudflare-inc")).toBeInTheDocument();
    expect(screen.getByTestId("admin-settings-subprocessor-resend-inc")).toBeInTheDocument();
  });

  it("runbook link points at the E40 runbook on GitHub main", () => {
    render(<Page />);
    // shadcn Button asChild forwards its data-testid to the child <a>,
    // so the testid IS the anchor — not a wrapping div.
    const link = screen.getByTestId("admin-settings-runbook-link");
    expect(link.tagName.toLowerCase()).toBe("a");
    expect(link.getAttribute("href")).toContain("tasks/E40-runbook.md");
    // External-link safety — must open in a new tab without leaking the
    // admin session via Referer.
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });
});
