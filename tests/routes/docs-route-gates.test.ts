import { describe, it, expect, vi, beforeEach } from "vitest";

// E47.1 / E48.1 — gate behaviour for /docs/* routes:
//
// * /docs/admin/*  → requireRole("admin") (chains AAL2 + has_role)
// * /docs/app/*    → requireSupabaseAuth() with NO requireOnboarded flag
//                    (admins without /app onboarding must still read docs)
// * /docs/{area}/$slug loader → notFound() when manifest miss, else slug
//
// We mock the two middleware modules so the test asserts the wiring
// without touching Supabase. The route's `Route.options.beforeLoad`
// / `Route.options.loader` are invoked directly via the same
// createFileRoute shim used by tests/routes/s-slug.test.ts.

const requireRoleMock = vi.fn();
const requireSupabaseAuthMock = vi.fn();

vi.mock("@/integrations/supabase/role-middleware", () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: (...args: unknown[]) => requireSupabaseAuthMock(...args),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute:
      () =>
      <T>(config: T) => ({ options: config }),
  };
});

import { Route as DocsAdminParent } from "@/routes/docs.admin";
import { Route as DocsAppParent } from "@/routes/docs.app";
import { Route as DocsAdminSlug } from "@/routes/docs.admin.$slug";
import { Route as DocsAppSlug } from "@/routes/docs.app.$slug";

type BeforeLoadFn = (ctx: { location: { pathname: string } }) => Promise<unknown>;
type LoaderFn = (ctx: { params: { slug: string } }) => { slug: string };

const adminParentBeforeLoad = (
  DocsAdminParent as unknown as { options: { beforeLoad: BeforeLoadFn } }
).options.beforeLoad;
const appParentBeforeLoad = (DocsAppParent as unknown as { options: { beforeLoad: BeforeLoadFn } })
  .options.beforeLoad;
const adminSlugLoader = (DocsAdminSlug as unknown as { options: { loader: LoaderFn } }).options
  .loader;
const appSlugLoader = (DocsAppSlug as unknown as { options: { loader: LoaderFn } }).options.loader;

describe("/docs/admin parent — auth gate", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
    requireSupabaseAuthMock.mockReset();
  });

  it("calls requireRole('admin', pathname) — chains AAL2 + has_role", async () => {
    requireRoleMock.mockResolvedValue({ session: {}, role: "admin" });
    await adminParentBeforeLoad({ location: { pathname: "/docs/admin/dashboard" } });
    expect(requireRoleMock).toHaveBeenCalledTimes(1);
    expect(requireRoleMock).toHaveBeenCalledWith("admin", "/docs/admin/dashboard");
    // sanity: we do NOT fall through to the looser /app gate
    expect(requireSupabaseAuthMock).not.toHaveBeenCalled();
  });

  it("propagates the redirect thrown by requireRole (non-admin / AAL1)", async () => {
    const redirectErr = Object.assign(new Error("redirect"), { status: 307 });
    requireRoleMock.mockRejectedValue(redirectErr);
    await expect(
      adminParentBeforeLoad({ location: { pathname: "/docs/admin/users" } }),
    ).rejects.toBe(redirectErr);
  });
});

describe("/docs/app parent — auth gate", () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
    requireSupabaseAuthMock.mockReset();
  });

  it("calls requireSupabaseAuth(pathname) — accepts any authenticated session", async () => {
    requireSupabaseAuthMock.mockResolvedValue({ session: {} });
    await appParentBeforeLoad({ location: { pathname: "/docs/app/dashboard" } });
    expect(requireSupabaseAuthMock).toHaveBeenCalledTimes(1);
    expect(requireSupabaseAuthMock).toHaveBeenCalledWith("/docs/app/dashboard");
    expect(requireRoleMock).not.toHaveBeenCalled();
  });

  it("does NOT pass requireOnboarded:true — admin without /app onboarding must still read docs", async () => {
    requireSupabaseAuthMock.mockResolvedValue({ session: {} });
    await appParentBeforeLoad({ location: { pathname: "/docs/app/profile" } });
    // Only one positional argument; no options object with requireOnboarded.
    const [, opts] = requireSupabaseAuthMock.mock.calls[0];
    expect(opts).toBeUndefined();
  });

  it("propagates the redirect thrown by requireSupabaseAuth (no session)", async () => {
    const redirectErr = Object.assign(new Error("redirect"), { status: 307 });
    requireSupabaseAuthMock.mockRejectedValue(redirectErr);
    await expect(appParentBeforeLoad({ location: { pathname: "/docs/app/library" } })).rejects.toBe(
      redirectErr,
    );
  });
});

describe("/docs/admin/$slug loader", () => {
  it("returns the slug when ADMIN_DOCS has an entry", () => {
    const out = adminSlugLoader({ params: { slug: "dashboard" } });
    expect(out).toEqual({ slug: "dashboard" });
  });

  it("throws notFound() when slug is unknown", () => {
    expect(() => adminSlugLoader({ params: { slug: "not-a-real-slug" } })).toThrow();
  });
});

describe("/docs/app/$slug loader", () => {
  it("returns the slug + manifest entry when APP_DOCS has an entry", () => {
    // E54.3 — the loader now also returns the discriminated entry so the
    // component can pick the explainer renderer vs the stub.
    const out = appSlugLoader({ params: { slug: "dashboard" } }) as {
      slug: string;
      entry: { kind: string; explainerKey?: string };
    };
    expect(out.slug).toBe("dashboard");
    expect(out.entry.kind).toBe("explainer");
    expect(out.entry.explainerKey).toBe("dashboard");
  });

  it("throws notFound() when slug is unknown", () => {
    expect(() => appSlugLoader({ params: { slug: "not-a-real-slug" } })).toThrow();
  });
});

describe("/docs/{area}/$slug head() — noindex + scoped title", () => {
  type HeadFn = (ctx: { loaderData?: { slug: string } | null }) => {
    meta: Array<Record<string, string>>;
  };
  const adminHead = (DocsAdminSlug as unknown as { options: { head: HeadFn } }).options.head;
  const appHead = (DocsAppSlug as unknown as { options: { head: HeadFn } }).options.head;

  it("admin head emits noindex,nofollow", () => {
    const out = adminHead({ loaderData: { slug: "dashboard" } });
    const robots = out.meta.find((m) => m.name === "robots");
    expect(robots?.content).toBe("noindex,nofollow");
  });

  it("app head emits noindex,nofollow", () => {
    const out = appHead({ loaderData: { slug: "dashboard" } });
    const robots = out.meta.find((m) => m.name === "robots");
    expect(robots?.content).toBe("noindex,nofollow");
  });

  it("admin head includes the slug in the title", () => {
    const out = adminHead({ loaderData: { slug: "users" } });
    const title = out.meta.find((m) => m.title)?.title;
    expect(title).toContain("admin/users");
  });

  it("app head includes the slug in the title", () => {
    const out = appHead({ loaderData: { slug: "library" } });
    const title = out.meta.find((m) => m.title)?.title;
    expect(title).toContain("app/library");
  });
});
