import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => getSession() },
    rpc: (fn: string, args: unknown) => rpc(fn, args),
  },
}));

import { requireRole } from "@/integrations/supabase/role-middleware";

describe("requireRole", () => {
  beforeEach(() => {
    getSession.mockReset();
    rpc.mockReset();
  });

  it("returns session + role when has_role() resolves true", async () => {
    const session = { access_token: "tok", user: { id: "u-admin" } };
    getSession.mockResolvedValue({ data: { session }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    const ctx = await requireRole("admin", "/admin");
    expect(ctx.role).toBe("admin");
    expect(ctx.session).toBe(session);
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "u-admin", _role: "admin" });
  });

  it("redirects when has_role() returns false", async () => {
    const session = { access_token: "tok", user: { id: "u-user" } };
    getSession.mockResolvedValue({ data: { session }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(requireRole("admin")).rejects.toMatchObject({ status: 307 });
  });

  it("redirects when has_role() errors", async () => {
    const session = { access_token: "tok", user: { id: "u-user" } };
    getSession.mockResolvedValue({ data: { session }, error: null });
    rpc.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(requireRole("admin")).rejects.toMatchObject({ status: 307 });
  });

  it("redirects to login when no session is present", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(requireRole("admin")).rejects.toMatchObject({ status: 307 });
    expect(rpc).not.toHaveBeenCalled();
  });
});
