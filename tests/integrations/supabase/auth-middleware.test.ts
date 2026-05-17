import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
    },
  },
}));

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

describe("requireSupabaseAuth", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("returns the session when one is present", async () => {
    const fake = { access_token: "tok", user: { id: "u1" } };
    getSession.mockResolvedValue({ data: { session: fake }, error: null });
    const ctx = await requireSupabaseAuth("/app");
    expect(ctx.session).toBe(fake);
  });

  it("throws a redirect when no session is present", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(requireSupabaseAuth("/app")).rejects.toMatchObject({
      status: 307,
    });
  });

  it("throws a redirect when getSession returns an error", async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new Error("boom"),
    });
    await expect(requireSupabaseAuth("/app")).rejects.toMatchObject({
      status: 307,
    });
  });
});
