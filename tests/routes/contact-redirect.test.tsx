import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
  Link: ({
    children,
    to,
    search,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    search?: Record<string, string>;
  }) => (
    <a href={search ? `${to}?${new URLSearchParams(search).toString()}` : to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/config/site", () => ({
  CONTACT_EMAIL: "podpora@subenai.sk",
  SITE_ORIGIN: "https://subenai.sk",
}));

vi.mock("@/i18n/marketing", () => ({
  tFor: () => (key: string) => key,
}));

vi.mock("@/config/routes", () => ({
  ROUTES: {
    home: "/",
    contact: "/contact",
    contactForm: "/contact-form",
    privacy: "/privacy",
  },
}));

import { Route, KontaktPage } from "@/routes/contact";

describe("/contact hub page", () => {
  it("has no beforeLoad (not a redirect)", () => {
    expect((Route as { beforeLoad?: unknown }).beforeLoad).toBeUndefined();
  });

  it("head sets index,follow robots meta", () => {
    const head = (
      Route as { head?: () => { meta: { name?: string; content?: string }[] } }
    ).head?.();
    const robots = head?.meta.find((m) => m.name === "robots");
    expect(robots?.content).toBe("index, follow");
  });

  it("renders the main CTA as a Link to /contact-form", () => {
    render(<KontaktPage />);
    const cta = screen.getByTestId("contact-main-form-link");
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/contact-form");
  });

  it("renders 6 topic chips deep-linking to /contact-form?topic=<slug>", () => {
    render(<KontaktPage />);
    const slugs = ["tech", "content", "sponsor", "gdpr", "press", "other"];
    slugs.forEach((slug) => {
      const chip = screen.getByTestId(`contact-topic-link-${slug}`);
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveAttribute("href", `/contact-form?topic=${slug}`);
    });
  });

  it("renders email fallback as plain text, not a mailto link", () => {
    render(<KontaktPage />);
    const fallback = screen.getByTestId("contact-email-fallback");
    expect(fallback.tagName).toBe("CODE");
    expect(fallback.closest("a")).toBeNull();
  });
});
