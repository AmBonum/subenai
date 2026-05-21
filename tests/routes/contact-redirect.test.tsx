import { describe, it, expect, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
  redirect: (args: { to: string; replace?: boolean }) => ({ _type: "redirect", ...args }),
}));

import { Route } from "@/routes/contact";
import { ROUTES } from "@/config/routes";

describe("/contact redirect", () => {
  it("beforeLoad throws a redirect to /kontakt", () => {
    let thrown: unknown;
    try {
      (Route as { beforeLoad?: () => void }).beforeLoad?.();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toMatchObject({ to: ROUTES.kontakt });
  });

  it("head sets noindex,nofollow robots meta", () => {
    const head = (
      Route as { head?: () => { meta: { name?: string; content?: string }[] } }
    ).head?.();
    const robots = head?.meta.find((m) => m.name === "robots");
    expect(robots?.content).toBe("noindex,nofollow");
  });
});
