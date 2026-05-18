import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const rpc = vi.fn();
const getAAL = vi.fn();
const listFactors = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      mfa: {
        getAuthenticatorAssuranceLevel: () => getAAL(),
        listFactors: () => listFactors(),
      },
    },
    rpc: (fn: string, args: unknown) => rpc(fn, args),
  },
}));

import { requireRole } from "@/integrations/supabase/role-middleware";

describe("requireRole", () => {
  beforeEach(() => {
    getSession.mockReset();
    rpc.mockReset();
    getAAL.mockReset();
    listFactors.mockReset();
    // Default to AAL2 + verified factor so non-admin tests don't have to
    // care; admin-AAL tests override per case.
    getAAL.mockResolvedValue({ data: { currentLevel: "aal2", nextLevel: "aal2" }, error: null });
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "f1", status: "verified" }] },
      error: null,
    });
  });

  it("returns session + role when has_role() resolves true (admin at AAL2)", async () => {
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

  it("redirects admin AAL1 with verified factor to /login/verify-2fa", async () => {
    const session = { access_token: "tok", user: { id: "u-admin" } };
    getSession.mockResolvedValue({ data: { session }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    getAAL.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    await expect(requireRole("admin", "/admin/dashboard")).rejects.toMatchObject({
      status: 307,
      options: expect.objectContaining({ to: "/login/verify-2fa" }),
    });
  });

  it("redirects admin AAL1 without any factor to /login/enroll-2fa", async () => {
    const session = { access_token: "tok", user: { id: "u-admin" } };
    getSession.mockResolvedValue({ data: { session }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    getAAL.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    await expect(requireRole("admin", "/admin")).rejects.toMatchObject({
      status: 307,
      options: expect.objectContaining({ to: "/login/enroll-2fa" }),
    });
  });

  it("does not enforce AAL2 for non-admin roles", async () => {
    const session = { access_token: "tok", user: { id: "u-user" } };
    getSession.mockResolvedValue({ data: { session }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    getAAL.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    const ctx = await requireRole("user");
    expect(ctx.role).toBe("user");
  });
});
