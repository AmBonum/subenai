import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { RespondentLandingHero } from "@/components/composer/edu/intake/RespondentLandingHero";

// E34 Phase 2 — landing hero unit tests.
//
// What we lock in here: (a) the eyebrow + subline render unconditionally,
// (b) the heading falls back to a brand-neutral string when creator_label
// is null, (c) the trust line picks the right branch per (collectsResponses,
// creatorLabel) tuple so the respondent's privacy expectation is correct
// for each share type. The third item is the conversion-critical assertion
// — a wrong trust line in edu mode would imply the author can't see scores,
// which would be a privacy misrepresentation.

afterEach(() => {
  cleanup();
});

describe("RespondentLandingHero — E34 Phase 2 landing copy", () => {
  it("always renders the eyebrow + subline regardless of label/mode", () => {
    render(<RespondentLandingHero creatorLabel={null} collectsResponses={false} />);
    expect(screen.getByTestId("respondent-hero-eyebrow")).toHaveTextContent(
      "TEST BEZPEČNOSTI · 5 MINÚT",
    );
    expect(screen.getByTestId("respondent-hero-subline")).toHaveTextContent(
      /5-minútový test odhalí, kde máš slepé miesta/,
    );
  });

  it("uses the creator_label as the heading when present (trim-safe)", () => {
    render(
      <RespondentLandingHero
        creatorLabel="  E-shop onboarding Q1 2026  "
        collectsResponses={true}
      />,
    );
    expect(screen.getByTestId("respondent-hero-heading")).toHaveTextContent(
      "E-shop onboarding Q1 2026",
    );
  });

  it("falls back to the brand-neutral heading when creator_label is null or all-whitespace", () => {
    render(<RespondentLandingHero creatorLabel={null} collectsResponses={true} />);
    expect(screen.getByTestId("respondent-hero-heading")).toHaveTextContent(
      "Vieš rozpoznať phishing?",
    );

    cleanup();

    render(<RespondentLandingHero creatorLabel="   " collectsResponses={true} />);
    expect(screen.getByTestId("respondent-hero-heading")).toHaveTextContent(
      "Vieš rozpoznať phishing?",
    );
  });

  it("trust line: edu mode + author known → 'Tvoj tím to chce vedieť. Skóre + meno vidí len {author}.'", () => {
    render(<RespondentLandingHero creatorLabel="ACME Security" collectsResponses={true} />);
    const trust = screen.getByTestId("respondent-hero-trust");
    expect(trust).toHaveTextContent(/Tvoj tím to chce vedieť/);
    expect(trust).toHaveTextContent(/Skóre \+ meno vidí len ACME Security/);
  });

  it("trust line: edu mode + author null → defaults to anonymous framing (no placeholder name)", () => {
    render(<RespondentLandingHero creatorLabel={null} collectsResponses={true} />);
    const trust = screen.getByTestId("respondent-hero-trust");
    // Must NOT inject a literal placeholder like "{author}" or "anonymous author".
    expect(trust.textContent).not.toMatch(/\{author\}/);
    expect(trust.textContent).not.toMatch(/anonym.+autor/i);
    // Falls through to the bland default — safer than misrepresenting.
    expect(trust).toHaveTextContent(/Anonymné, bez registrácie/);
  });

  it("trust line: non-edu mode → 'Výsledky vidíš len ty. Nikam sa neukladajú.' (no author mention, no row stored)", () => {
    render(<RespondentLandingHero creatorLabel="Test ABC" collectsResponses={false} />);
    const trust = screen.getByTestId("respondent-hero-trust");
    expect(trust).toHaveTextContent(/Výsledky vidíš len ty/);
    expect(trust).toHaveTextContent(/Nikam sa neukladajú/);
    // Importantly does NOT claim author can see results — non-edu mode
    // means no respondent row is persisted, so an "author sees your score"
    // line here would be factually wrong.
    expect(trust.textContent).not.toMatch(/vidí len Test ABC/);
  });
});
