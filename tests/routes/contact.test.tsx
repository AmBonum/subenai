import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  createFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
}));

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({
    openPreferences: vi.fn(),
    record: null,
  }),
}));

import { KontaktPage } from "@/routes/contact";
import { CONTACT_EMAIL } from "@/config/site";

describe("KontaktPage (/contact)", () => {
  it("renders the page heading and CONTACT_EMAIL primary CTA", () => {
    render(<KontaktPage />);
    expect(screen.getByRole("heading", { level: 1, name: /Kontakt/i })).toBeInTheDocument();
    const primaryCta = screen.getByRole("link", {
      name: new RegExp(`Napísať na ${CONTACT_EMAIL}`, "i"),
    });
    expect(primaryCta).toHaveAttribute("href", expect.stringContaining(`mailto:${CONTACT_EMAIL}`));
    expect(primaryCta.getAttribute("href")).toContain("subject=subenai");
  });

  it("offers all 6 triage topics each with prefilled mailto subject", () => {
    render(<KontaktPage />);
    const main = screen.getByRole("main");
    const expectedSubjects = [
      "Technická pomoc",
      "Obsahová otázka",
      "Sponzorstvo a faktúry",
      "GDPR žiadosť",
      "Spolupráca",
      "Otázka",
    ];
    const mailtoLinks = within(main)
      .getAllByRole("link")
      .filter((a) => (a.getAttribute("href") ?? "").startsWith(`mailto:${CONTACT_EMAIL}`));
    const decodedSubjects = mailtoLinks.map((a) => {
      const href = a.getAttribute("href") ?? "";
      const query = href.split("?")[1] ?? "";
      return new URLSearchParams(query).get("subject") ?? "";
    });
    for (const subject of expectedSubjects) {
      expect(
        decodedSubjects.some((s) => s.includes(subject)),
        `expected at least one mailto with subject containing "${subject}"`,
      ).toBe(true);
    }
  });

  it('shows operator identity block with "sídlo" + ORSR (unique to /contact body)', () => {
    render(<KontaktPage />);
    const main = screen.getByRole("main");
    // am.bonum + IČO appear in Footer too; sídlo + ORSR are unique to this page.
    expect(within(main).getByText(/Spišská Nová Ves/)).toBeInTheDocument();
    expect(within(main).getByText(/55453\/V/)).toBeInTheDocument();
  });

  it("links to /privacy for GDPR details", () => {
    render(<KontaktPage />);
    const main = screen.getByRole("main");
    const privacyLink = within(main)
      .getAllByRole("link")
      .find((a) => a.getAttribute("data-to") === "/privacy");
    expect(privacyLink).toBeDefined();
  });
});
