import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

function makeChain(result: { count: number | null; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    in: () => chain,
    is: () => chain,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

describe("LiveSupportBadge", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders nothing when count is 0", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: () => makeChain({ count: 0, error: null }) },
    }));
    const { LiveSupportBadge: Badge } = await import("@/components/admin/queue/LiveSupportBadge");
    const { container } = render(<Badge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders badge with text '1' when count is 1", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: () => makeChain({ count: 1, error: null }) },
    }));
    const { LiveSupportBadge: Badge } = await import("@/components/admin/queue/LiveSupportBadge");
    render(<Badge />);
    const badge = await screen.findByTestId("admin-shell-sidebar-support-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("1");
    expect(badge.className).toContain("bg-destructive");
  });

  it("renders badge with text '99' when count is 99", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: () => makeChain({ count: 99, error: null }) },
    }));
    const { LiveSupportBadge: Badge } = await import("@/components/admin/queue/LiveSupportBadge");
    render(<Badge />);
    const badge = await screen.findByTestId("admin-shell-sidebar-support-badge");
    expect(badge).toHaveTextContent("99");
  });

  it("renders badge with text '99+' when count is 100", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: () => makeChain({ count: 100, error: null }) },
    }));
    const { LiveSupportBadge: Badge } = await import("@/components/admin/queue/LiveSupportBadge");
    render(<Badge />);
    const badge = await screen.findByTestId("admin-shell-sidebar-support-badge");
    expect(badge).toHaveTextContent("99+");
  });

  it("renders badge with text '99+' when count is 120", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: () => makeChain({ count: 120, error: null }) },
    }));
    const { LiveSupportBadge: Badge } = await import("@/components/admin/queue/LiveSupportBadge");
    render(<Badge />);
    const badge = await screen.findByTestId("admin-shell-sidebar-support-badge");
    expect(badge).toHaveTextContent("99+");
  });

  it("renders nothing and calls console.warn on error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        from: () => makeChain({ count: null, error: { message: "db error" } }),
      },
    }));
    const { LiveSupportBadge: Badge } = await import("@/components/admin/queue/LiveSupportBadge");
    const { container } = render(<Badge />);
    // allow query to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});
