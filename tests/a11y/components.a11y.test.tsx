import { describe, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { expectNoA11yViolations } from "../utils/axe";
import { ManualShareCard } from "@/components/quiz/share/ManualShareCard";
import { SocialShareGrid } from "@/components/quiz/share/SocialShareGrid";
import { AnswerFeedback } from "@/components/quiz/review/AnswerFeedback";
import { SurveyQuestion } from "@/components/quiz/survey/SurveyQuestion";
import type { Question } from "@/lib/quiz/bank/questions";

const SHARE_URL = "https://subenai.eu/r/ABC12345";
const SHARE_TEXT = "Som Internet Ninja na subenai — 75/100.";

function makeQuestion(): Question {
  return {
    id: "q-a11y",
    category: "phishing",
    difficulty: "easy",
    prompt: "Je táto SMS od banky?",
    visual: { kind: "text", label: "SMS", body: "Klikni sem" },
    options: [
      { id: "a", label: "Áno", correct: false, severity: "critical" },
      { id: "b", label: "Nie, je to phishing", correct: true, severity: null },
    ],
    explanation: "Banka nikdy neposiela odkazy na klik.",
  };
}

// First wave of automated WCAG 2.1 A/AA assertions. The pattern is the
// deliverable: every new component test should add an
// `expectNoA11yViolations(container)` line. Extend this set as components
// are touched (CLAUDE.md test-id discipline § applies to a11y too).
describe("a11y — quiz share + review + survey components", () => {
  it("ManualShareCard has no WCAG A/AA violations", async () => {
    const { container } = render(
      <ManualShareCard
        url={SHARE_URL}
        text={SHARE_TEXT}
        onDownloadStory={vi.fn().mockResolvedValue(undefined)}
        downloading={false}
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("SocialShareGrid has no WCAG A/AA violations", async () => {
    const { container } = render(<SocialShareGrid url={SHARE_URL} text={SHARE_TEXT} />);
    await expectNoA11yViolations(container);
  });

  it("AnswerFeedback (review mode) has no WCAG A/AA violations", async () => {
    const { container } = render(
      <AnswerFeedback question={makeQuestion()} selectedId="a" mode="review" />,
    );
    await expectNoA11yViolations(container);
  });

  it("SurveyQuestion (single choice) has no WCAG A/AA violations", async () => {
    const { container } = render(
      <SurveyQuestion
        type="single"
        label="Aký je tvoj vek?"
        options={[
          { id: "18-29", label: "18–29" },
          { id: "30-49", label: "30–49" },
        ]}
        value=""
        onChange={() => {}}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
