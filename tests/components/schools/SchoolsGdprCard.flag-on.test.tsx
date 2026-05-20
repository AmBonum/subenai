import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

// Force the feature flag to true so the CTA renders the TanStack Link
// path (i.e. SPA navigation to /schools/dpa) instead of the legacy
// mailto fallback. Mirrors what production will do once the operator
// sets VITE_DPA_FLOW_ENABLED=true in Cloudflare Pages env.
vi.mock("@/lib/dpa/feature-flag", () => ({
  IS_DPA_FLOW_ENABLED: true,
  DEFAULT_DPA_TEMPLATE_VERSION: "v0.1",
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { SchoolsGdprCard } from "@/components/schools/SchoolsGdprCard";

describe("SchoolsGdprCard — flag-on path", () => {
  it("DPA CTA points to /schools/dpa via TanStack Link, NOT mailto", () => {
    render(<SchoolsGdprCard />);
    const link = screen.getByTestId("schools-gdpr-dpa-link");
    const href = link.getAttribute("href") ?? "";
    const dataTo = link.getAttribute("data-to") ?? "";
    expect(href, "should NOT be a mailto when flag is on").not.toMatch(/^mailto:/);
    // Our Link mock surfaces the destination via data-to.
    expect(dataTo).toBe("/schools/dpa");
  });

  it("CTA copy is preserved across the swap", () => {
    render(<SchoolsGdprCard />);
    const link = screen.getByTestId("schools-gdpr-dpa-link");
    expect(link.textContent ?? "").toMatch(/DPA/i);
  });
});
