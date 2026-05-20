import { tFor } from "@/i18n/quiz";

// E34 Phase 2 (D3 = "(b) confidence framing", owner override locked in
// PLAN-2026-05-20-E34) — the hero a first-time visitor sees when they
// click a share link from Slack/Teams/email. Before this component, the
// respondent landed on a bare h1 ("Pripravený test pre teba") + a start
// button. No 5-minute promise, no answer to "who sent me this", no
// answer to "who sees my score" — three conversion-blockers in the same
// fold. ~40% of cold visitors bounced before starting (per the audit
// on PR #50).
//
// Confidence framing opens with a provocative question that doubles as
// the value proposition ("Vieš rozpoznať phishing?"). The owner override
// vs the senior default (trust framing) was deliberate — engagement bias
// for the cold-respondent audience.
//
// Four lines that answer the conversion blockers in order:
//   eyebrow:  "TEST BEZPEČNOSTI · 5 MINÚT"                                    — what + how long
//   heading:  creator_label if defined, else "Vieš rozpoznať phishing?"        — the hook
//   subline:  "5-minútový test odhalí, kde máš slepé miesta…"                  — what value
//   trust:    one of three context-specific lines                              — who sees results
//
// Trust line variants depend on `collectsResponses`:
//   • true  + author known  → "Tvoj tím to chce vedieť. Skóre + meno vidí len {author}."
//   • true  + author null   → "Anonymné, bez registrácie."  (safer default
//                              than a placeholder name)
//   • false                 → "Výsledky vidíš len ty. Nikam sa neukladajú."

interface Props {
  /** test_sets.creator_label — null when the author skipped naming the test. */
  creatorLabel: string | null;
  /** test_sets.collects_responses — true for edu mode, false for public share. */
  collectsResponses: boolean;
}

export function RespondentLandingHero({ creatorLabel, collectsResponses }: Props) {
  const t = tFor("respondent_landing");
  const trimmedLabel = creatorLabel?.trim() || null;

  // Heading: prefer the author's own label (recognised by the respondent),
  // else the brand-neutral framing key ("Tvoj tím ti poslal test…").
  const heading = trimmedLabel ?? t("heading_default");

  // Trust line: pick the branch that matches the respondent's posture.
  // We never inject the literal string "anonymous author" — when we don't
  // know who sent it, drop the personalised mention entirely.
  const trustLine = !collectsResponses
    ? t("trust_line_no_collect")
    : trimmedLabel
      ? t("trust_line_author", { author: trimmedLabel })
      : t("trust_line_default");

  return (
    <section
      data-testid="respondent-hero-root"
      // Centered on mobile + left-aligned from md ↑ matches the existing
      // landing-page header alignment so the hero swap doesn't shift the
      // visual rhythm of the page when the respondent reloads.
      className="text-center md:text-left"
    >
      <p
        data-testid="respondent-hero-eyebrow"
        className="text-xs font-bold uppercase tracking-[0.18em] text-primary"
      >
        {t("eyebrow")}
      </p>
      <h1
        data-testid="respondent-hero-heading"
        className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl"
      >
        {heading}
      </h1>
      <p
        data-testid="respondent-hero-subline"
        className="mt-3 text-base text-muted-foreground sm:text-lg"
      >
        {t("subline")}
      </p>
      <p data-testid="respondent-hero-trust" className="mt-2 text-sm text-muted-foreground">
        {trustLine}
      </p>
    </section>
  );
}
